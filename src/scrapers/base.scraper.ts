import type { Page } from 'playwright';
import type { ScrapeCategory } from '../config/index.js';
import { BrowserManager } from '../lib/browser/browser-manager.js';
import { PagePool } from '../lib/browser/page-pool.js';
import { logger } from '../lib/logger.js';
import { withRetry } from '../lib/retry.js';
import type { Job } from '../types/job.js';
import { normalizeJobTextFields } from '../utils/cleaning.js';

export abstract class BaseScraper {
  abstract readonly sourceName: string;
  abstract readonly category: ScrapeCategory;
  abstract readonly companyName: string;

  protected readonly pagePool: PagePool;

  constructor(pagePool?: PagePool) {
    this.pagePool = pagePool ?? new PagePool();
  }

  abstract scrape(): Promise<Job[]>;

  async run(): Promise<Job[]> {
    const startedAt = Date.now();
    logger.info({ source: this.sourceName, category: this.category }, 'Scrape started');

    try {
      await BrowserManager.getInstance().initialize();
      const jobs = await withRetry(() => this.scrape(), this.sourceName);
      const normalized = jobs.map((job) => this.normalize(job));

      logger.info(
        {
          source: this.sourceName,
          jobsFound: normalized.length,
          durationMs: Date.now() - startedAt,
        },
        'Scrape completed',
      );

      return normalized;
    } catch (error) {
      logger.error(
        {
          err: error,
          source: this.sourceName,
          durationMs: Date.now() - startedAt,
        },
        'Scrape failed',
      );
      throw error;
    }
  }

  protected normalize(raw: Partial<Job> & Pick<Job, 'sourceJobId' | 'title' | 'applicationUrl'>): Job {
    const base: Job = {
      source: this.sourceName,
      sourceJobId: raw.sourceJobId,
      title: raw.title,
      company: raw.company ?? this.companyName,
      city: raw.city ?? 'Casablanca',
      country: raw.country ?? 'Morocco',
      description: raw.description ?? raw.title,
      applicationUrl: raw.applicationUrl,
      tags: raw.tags ?? [this.category],
      ...(raw.requirements !== undefined && { requirements: raw.requirements }),
      ...(raw.salary !== undefined && { salary: raw.salary }),
      ...(raw.contractType !== undefined && { contractType: raw.contractType }),
      ...(raw.remote !== undefined && { remote: raw.remote }),
      ...(raw.publishedAt !== undefined && { publishedAt: raw.publishedAt }),
      ...(raw.expiresAt !== undefined && { expiresAt: raw.expiresAt }),
      ...(raw.rawHtml !== undefined && { rawHtml: raw.rawHtml }),
    };

    return normalizeJobTextFields(base);
  }

  protected async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const page = await this.pagePool.acquire();
    try {
      return await fn(page);
    } finally {
      await this.pagePool.release(page);
    }
  }
}
