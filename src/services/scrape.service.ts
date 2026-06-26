import type { ScrapeCategory } from '../config/index.js';
import { config as appConfig } from '../config/index.js';
import { BrowserManager } from '../lib/browser/browser-manager.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import { logger } from '../lib/logger.js';
import type { JobRepository } from '../repositories/job.repository.js';
import type { ScrapeLogRepository } from '../repositories/scrape-log.repository.js';
import type { SourceProfileRepository } from '../repositories/source-profile.repository.js';
import { validateJobBatch } from '../platform/job-validator.js';
import { buildCrawlValidationReport } from '../platform/crawl-validation.js';
import { closeLinkedInBrowser } from '../scrapers/linkedin/session.js';
import type { BaseScraper } from '../scrapers/base.scraper.js';
import type { Job, PersistResult, ScrapeRunStats } from '../types/job.js';
import { enrichAndPrepare } from './enrichment.service.js';
import { getPrisma } from '../lib/prisma.js';
import { mergeDuplicateJobs } from '../platform/duplicate-merger.js';
import { rankJobsByFreshness } from '../platform/job-ranker.js';

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
    private readonly sourceProfileRepo: SourceProfileRepository,
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
    let validationReport: Record<string, unknown> | undefined;

    try {
      jobs = await scraper.run();
      const result = await this.persistEnriched(jobs, 'linkedin');
      persist = result.persist;
      validationReport = result.validationReport;
      const expired = await this.jobRepo.deactivateExpired();
      const unverified = await this.jobRepo.archiveUnverified('linkedin', 14);
      if (expired > 0 || unverified > 0) {
        logger.info({ expired, unverified }, 'LinkedIn expiry sweep');
      }
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
    await this.sourceProfileRepo.recordCrawlComplete('linkedin', stats, validationReport);
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
    let validationReport: Record<string, unknown> | undefined;

    try {
      jobs = await scraper.run();
      const result = await this.persistEnriched(jobs, registration.sourceName);
      persist = result.persist;
      validationReport = result.validationReport;
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
    await this.sourceProfileRepo.recordCrawlComplete(
      registration.sourceName,
      stats,
      validationReport,
    );

    logger.info(
      {
        source: stats.source,
        jobsFound: stats.jobsFound,
        jobsInserted: stats.jobsInserted,
        jobsUpdated: stats.jobsUpdated,
        status: stats.status,
        validation: validationReport,
      },
      'Scrape run logged',
    );

    return stats;
  }

  private async persistEnriched(
    jobs: Job[],
    source?: string,
  ): Promise<{ persist: PersistResult; validationReport: Record<string, unknown> }> {
    const sorted = rankJobsByFreshness(jobs);
    const { accepted, rejected, report } = validateJobBatch(sorted);

    if (rejected.length > 0) {
      logger.warn(
        { source, rejected: rejected.length, flags: report.flagCounts },
        'Jobs rejected by validation',
      );
    }

    const enriched = enrichAndPrepare(accepted);
    const persist = await this.jobRepo.upsertEnrichedMany(
      enriched.map((e) => ({
        job: e.job,
        skills: e.skills,
        companyEnrichment: e.companyEnrichment,
      })),
    );

    if (source && accepted.length > 0) {
      await this.jobRepo.markStaleInactive(
        source,
        accepted.map((j) => j.sourceJobId),
      );
    }

    const expiredArchived = await this.jobRepo.deactivateExpired();
    const unverifiedArchived = source ? await this.jobRepo.archiveUnverified(source, 21) : 0;

    if (persist.inserted > 0 || persist.updated > 0) {
      await mergeDuplicateJobs(getPrisma()).catch(() => undefined);
    }

    const crawlReport = await buildCrawlValidationReport(getPrisma(), {
      source: source ?? 'unknown',
      category: '',
      startedAt: new Date(),
      endedAt: new Date(),
      durationMs: 0,
      jobsFound: jobs.length,
      jobsInserted: persist.inserted,
      jobsUpdated: persist.updated,
      duplicates: persist.duplicates,
      status: 'success',
    }, persist, { expiredArchived, unverifiedArchived });

    return {
      persist,
      validationReport: { ...report, crawlValidation: crawlReport } as unknown as Record<string, unknown>,
    };
  }

  async shutdown(): Promise<void> {
    await this.pagePool.drain();
    await BrowserManager.getInstance().close();
    await closeLinkedInBrowser();
  }
}
