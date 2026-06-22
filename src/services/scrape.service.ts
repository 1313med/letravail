import type { ScrapeCategory } from '../config/index.js';
import { config as appConfig } from '../config/index.js';
import { BrowserManager } from '../lib/browser/browser-manager.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import { logger } from '../lib/logger.js';
import type { JobRepository } from '../repositories/job.repository.js';
import type { ScrapeLogRepository } from '../repositories/scrape-log.repository.js';
import { closeLinkedInBrowser } from '../scrapers/linkedin/session.js';
import type { BaseScraper } from '../scrapers/base.scraper.js';
import type { Job, PersistResult, ScrapeRunStats } from '../types/job.js';

export type ScraperFactory = (pagePool: PagePool) => BaseScraper;

export interface ScraperRegistration {
  sourceName: string;
  category: ScrapeCategory;
  factory: ScraperFactory;
  schedule?: 'every6hours' | 'daily';
}

export class ScrapeService {
  constructor(
    private readonly jobRepo: JobRepository,
    private readonly scrapeLogRepo: ScrapeLogRepository,
    private readonly registry: ScraperRegistration[],
    private readonly pagePool: PagePool,
  ) {}

  getRegistry(): ScraperRegistration[] {
    return this.registry;
  }

  async scrapeSource(sourceName: string): Promise<ScrapeRunStats> {
    const registration = this.registry.find((r) => r.sourceName === sourceName);
    if (!registration) {
      throw new Error(`Unknown source: ${sourceName}`);
    }
    return this.runScraper(registration);
  }

  async scrapeCategory(category: ScrapeCategory): Promise<ScrapeRunStats[]> {
    const scrapers = this.registry.filter((r) => r.category === category);
    return this.scrapeMany(scrapers);
  }

  async scrapeAll(): Promise<ScrapeRunStats[]> {
    return this.scrapeMany(this.registry);
  }

  async scrapeLinkedIn(): Promise<ScrapeRunStats> {
    const { LinkedInScraper } = await import('../scrapers/linkedin/linkedin.scraper.js');
    const startedAt = new Date();
    const scraper = new LinkedInScraper();

    let jobs: Job[] = [];
    let persist: PersistResult = { inserted: 0, updated: 0, duplicates: 0 };
    let errorMessage: string | undefined;

    try {
      jobs = await scraper.run();
      persist = await this.jobRepo.upsertMany(jobs);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, source: 'linkedin' }, 'LinkedIn scraper failed');
    }

    const endedAt = new Date();
    const stats: ScrapeRunStats = {
      source: 'linkedin',
      category: 'linkedin',
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
      jobsFound: jobs.length,
      jobsInserted: persist.inserted,
      jobsUpdated: persist.updated,
      duplicates: persist.duplicates,
      status: errorMessage ? (jobs.length > 0 ? 'partial' : 'failed') : 'success',
      ...(errorMessage !== undefined && { errorMessage }),
    };

    await this.scrapeLogRepo.create(stats);
    logger.info({ ...stats }, 'LinkedIn scrape run logged');
    return stats;
  }

  private async scrapeMany(registrations: ScraperRegistration[]): Promise<ScrapeRunStats[]> {
    const results: ScrapeRunStats[] = [];
    const batchSize = appConfig.maxConcurrentSources;

    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize);
      const settled = await Promise.allSettled(batch.map((r) => this.runScraper(r)));

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error({ err: result.reason }, 'Unhandled scraper batch failure');
        }
      }
    }

    return results;
  }

  private async runScraper(registration: ScraperRegistration): Promise<ScrapeRunStats> {
    const startedAt = new Date();
    const scraper = registration.factory(this.pagePool);

    let jobs: Job[] = [];
    let persist: PersistResult = { inserted: 0, updated: 0, duplicates: 0 };
    let errorMessage: string | undefined;

    try {
      jobs = await scraper.run();
      persist = await this.jobRepo.upsertMany(jobs);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { err: error, source: registration.sourceName },
        'Scraper failed — continuing pipeline',
      );
    }

    const endedAt = new Date();
    const stats: ScrapeRunStats = {
      source: registration.sourceName,
      category: registration.category,
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
      jobsFound: jobs.length,
      jobsInserted: persist.inserted,
      jobsUpdated: persist.updated,
      duplicates: persist.duplicates,
      status: errorMessage ? (jobs.length > 0 ? 'partial' : 'failed') : 'success',
      ...(errorMessage !== undefined && { errorMessage }),
    };

    await this.scrapeLogRepo.create(stats);

    logger.info(
      {
        source: stats.source,
        category: stats.category,
        startTime: stats.startedAt.toISOString(),
        endTime: stats.endedAt.toISOString(),
        durationMs: stats.durationMs,
        jobsFound: stats.jobsFound,
        jobsInserted: stats.jobsInserted,
        jobsUpdated: stats.jobsUpdated,
        duplicates: stats.duplicates,
        status: stats.status,
        failures: stats.errorMessage,
      },
      'Scrape run logged',
    );

    return stats;
  }

  async shutdown(): Promise<void> {
    await this.pagePool.drain();
    await BrowserManager.getInstance().close();
    await closeLinkedInBrowser();
  }
}
