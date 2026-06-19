import type { Page } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../logger.js';
import { BrowserManager } from './browser-manager.js';

export class PagePool {
  private readonly pool: Page[] = [];
  private readonly inUse = new Set<Page>();
  private readonly maxSize: number;
  private readonly waitQueue: Array<(page: Page) => void> = [];

  constructor(maxSize = config.pagePoolSize) {
    this.maxSize = maxSize;
  }

  async acquire(): Promise<Page> {
    const idle = this.pool.pop();
    if (idle && !idle.isClosed()) {
      this.inUse.add(idle);
      return idle;
    }

    if (this.inUse.size < this.maxSize) {
      const context = BrowserManager.getInstance().getContext();
      const page = await context.newPage();
      page.setDefaultTimeout(config.scrapeTimeoutMs);
      this.inUse.add(page);
      return page;
    }

    return new Promise<Page>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  async release(page: Page): Promise<void> {
    this.inUse.delete(page);

    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.inUse.add(page);
        next(page);
        return;
      }
    }

    if (page.isClosed()) return;

    try {
      await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5_000 });
      this.pool.push(page);
    } catch {
      await page.close().catch(() => undefined);
      logger.debug('Discarded page after release cleanup failure');
    }
  }

  async drain(): Promise<void> {
    const all = [...this.pool, ...this.inUse];
    this.pool.length = 0;
    this.inUse.clear();
    this.waitQueue.length = 0;
    await Promise.all(all.map((p) => p.close().catch(() => undefined)));
  }

  get stats(): { pooled: number; inUse: number; waiting: number } {
    return { pooled: this.pool.length, inUse: this.inUse.size, waiting: this.waitQueue.length };
  }
}
