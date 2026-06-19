import { chromium, type Browser, type BrowserContext } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../logger.js';

export class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    BrowserManager.instance ??= new BrowserManager();
    return BrowserManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.browser?.isConnected()) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const start = Date.now();
    this.browser = await chromium.launch({
      headless: config.browserHeadless,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      viewport: { width: 1280, height: 720 },
    });

    logger.info({ durationMs: Date.now() - start }, 'Browser initialized');
    this.initPromise = null;
  }

  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('BrowserManager not initialized. Call initialize() first.');
    }
    return this.context;
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
    this.initPromise = null;
    logger.info('Browser closed');
  }
}
