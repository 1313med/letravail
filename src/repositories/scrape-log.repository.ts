import type { PrismaClient, ScrapeLog } from '@prisma/client';
import type { ScrapeRunStats } from '../types/job.js';

export class ScrapeLogRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(stats: ScrapeRunStats): Promise<ScrapeLog> {
    return this.db.scrapeLog.create({
      data: {
        source: stats.source,
        category: stats.category,
        status: stats.status,
        startedAt: stats.startedAt,
        endedAt: stats.endedAt,
        durationMs: stats.durationMs,
        jobsFound: stats.jobsFound,
        jobsInserted: stats.jobsInserted,
        jobsUpdated: stats.jobsUpdated,
        duplicates: stats.duplicates,
        errorMessage: stats.errorMessage,
      },
    });
  }
}
