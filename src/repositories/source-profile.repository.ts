import type { Prisma, PrismaClient } from '@prisma/client';
import type { ScrapeRunStats } from '../types/job.js';
import { getCrawlInterval, computeNextCrawlAt } from '../platform/crawl-schedule.js';
import { learnCrawlInterval } from '../platform/crawl-intelligence.js';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';
import type { ScraperRegistration } from '../services/scrape.service.js';

export class SourceProfileRepository {
  constructor(private readonly db: PrismaClient) {}

  async syncFromRegistry(registry: ScraperRegistration[]): Promise<void> {
    for (const reg of registry) {
      const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === reg.sourceName);
      const interval = getCrawlInterval(reg.sourceName, reg.schedule);

      await this.db.sourceProfile.upsert({
        where: { sourceName: reg.sourceName },
        create: {
          sourceName: reg.sourceName,
          category: reg.category,
          companyName: catalog?.companyName ?? reg.sourceName,
          crawlIntervalMinutes: interval,
          careerPageUrl: catalog?.careerPageUrl,
          atsPlatform: catalog?.atsPlatform,
          status: catalog?.status === 'planned' ? 'planned' : 'active',
          activeJobs: await this.db.job.count({ where: { source: reg.sourceName, isActive: true } }),
          metadata: { priority: catalog?.priority ?? 50 },
        },
        update: {
          category: reg.category,
          crawlIntervalMinutes: interval,
          careerPageUrl: catalog?.careerPageUrl,
          atsPlatform: catalog?.atsPlatform,
          activeJobs: await this.db.job.count({ where: { source: reg.sourceName, isActive: true } }),
        },
      });
    }

    await this.db.sourceProfile.upsert({
      where: { sourceName: 'linkedin' },
      create: {
        sourceName: 'linkedin',
        category: 'linkedin',
        companyName: 'LinkedIn Morocco',
        crawlIntervalMinutes: 60,
        status: 'active',
      },
      update: { crawlIntervalMinutes: 60 },
    });
  }

  async getProfile(sourceName: string) {
    return this.db.sourceProfile.findUnique({ where: { sourceName } });
  }

  async getDueSources(): Promise<Array<{ sourceName: string; category: string }>> {
    const now = new Date();
    const profiles = await this.db.sourceProfile.findMany({
      where: {
        status: { in: ['active'] },
        OR: [{ nextCrawlAt: null }, { nextCrawlAt: { lte: now } }],
      },
      orderBy: { intelligenceScore: 'desc' },
    });
    return profiles.map((p) => ({ sourceName: p.sourceName, category: p.category }));
  }

  async recordCrawlComplete(
    sourceName: string,
    stats: ScrapeRunStats,
    validationReport?: Record<string, unknown>,
  ): Promise<void> {
    const profile = await this.db.sourceProfile.findUnique({ where: { sourceName } });
    const interval = profile?.crawlIntervalMinutes ?? 360;
    const now = new Date();

    const activeJobs = await this.db.job.count({ where: { source: sourceName, isActive: true } });
    const archivedJobs = await this.db.job.count({ where: { source: sourceName, isActive: false } });

    const sampleJobs = await this.db.job.findMany({
      where: { source: sourceName, isActive: true },
      select: { description: true },
      take: 200,
    });
    const avgDescLen =
      sampleJobs.length > 0
        ? Math.round(sampleJobs.reduce((a, j) => a + j.description.length, 0) / sampleJobs.length)
        : 0;

    const withSkills = await this.db.job.count({
      where: { source: sourceName, isActive: true, skills: { some: {} } },
    });
    const withExp = await this.db.job.count({
      where: {
        source: sourceName,
        isActive: true,
        OR: [{ experienceLevel: { not: null } }, { experienceYears: { not: null } }],
      },
    });

    const recentLogs = await this.db.scrapeLog.findMany({
      where: { source: sourceName },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    const failures = recentLogs.filter((l) => l.status === 'failed').length;
    const failureRate = recentLogs.length > 0 ? failures / recentLogs.length : 0;
    const duplicateRate =
      stats.jobsFound > 0 ? stats.duplicates / stats.jobsFound : 0;

    const skillCoverage = activeJobs > 0 ? withSkills / activeJobs : 0;
    const experienceCoverage = activeJobs > 0 ? withExp / activeJobs : 0;

    const intelligenceScore = computeIntelligenceScore({
      avgDescriptionLength: avgDescLen,
      skillCoverage,
      experienceCoverage,
      failureRate,
      duplicateRate,
      activeJobs,
    });

    const freshnessScore = stats.status === 'success' ? 85 : stats.status === 'partial' ? 50 : 20;

    const learned = await learnCrawlInterval(this.db, sourceName).catch(() => null);
    const effectiveInterval = learned?.newInterval ?? interval;

    await this.db.sourceProfile.upsert({
      where: { sourceName },
      create: {
        sourceName,
        category: stats.category,
        companyName: sourceName,
        lastCrawlAt: now,
        nextCrawlAt: computeNextCrawlAt(effectiveInterval, now),
        jobsDiscovered: stats.jobsFound,
        activeJobs,
        archivedJobs,
        avgDescriptionLength: avgDescLen,
        skillCoverage,
        experienceCoverage,
        avgCrawlDurationMs: stats.durationMs,
        failureRate,
        duplicateRate,
        intelligenceScore,
        freshnessScore,
        lastValidationReport: validationReport as Prisma.InputJsonValue,
        status: failureRate > 0.5 ? 'maintenance' : activeJobs === 0 ? 'stale' : 'active',
      },
      update: {
        lastCrawlAt: now,
        nextCrawlAt: computeNextCrawlAt(effectiveInterval, now),
        crawlIntervalMinutes: effectiveInterval,
        jobsDiscovered: stats.jobsFound,
        activeJobs,
        archivedJobs,
        avgDescriptionLength: avgDescLen,
        skillCoverage,
        experienceCoverage,
        avgCrawlDurationMs: stats.durationMs,
        failureRate,
        duplicateRate,
        intelligenceScore,
        freshnessScore,
        lastValidationReport: validationReport as Prisma.InputJsonValue,
        status: failureRate > 0.5 ? 'maintenance' : activeJobs === 0 ? 'stale' : 'active',
      },
    });
  }
}

function computeIntelligenceScore(metrics: {
  avgDescriptionLength: number;
  skillCoverage: number;
  experienceCoverage: number;
  failureRate: number;
  duplicateRate: number;
  activeJobs: number;
}): number {
  const descScore = Math.min(100, (metrics.avgDescriptionLength / 500) * 100) * 0.3;
  const skillScore = metrics.skillCoverage * 100 * 0.25;
  const expScore = metrics.experienceCoverage * 100 * 0.15;
  const reliability = (1 - metrics.failureRate) * 100 * 0.15;
  const volume = Math.min(100, metrics.activeJobs / 5) * 0.15;
  return Math.round(descScore + skillScore + expScore + reliability + volume);
}
