import type { PrismaClient } from '@prisma/client';
import { ATS_PLATFORM_PROFILES } from '../platform/ats-platform-profiles.js';
import type { PlatformMetricsSnapshot } from '../platform/ats-metrics-engine.js';

export class AtsPlatformRepository {
  constructor(private readonly db: PrismaClient) {}

  async seedProfiles(): Promise<number> {
    let seeded = 0;
    for (const profile of ATS_PLATFORM_PROFILES) {
      await this.db.atsPlatformIntelligence.upsert({
        where: { platform: profile.platform },
        create: {
          platform: profile.platform,
          displayName: profile.displayName,
          priority: profile.priority,
          detectionConfidence: profile.detectionConfidence,
          authRequired: profile.authRequired,
          paginationStrategy: profile.paginationStrategy,
          apiEndpointPattern: profile.apiEndpointPattern,
          networkRequestHints: profile.networkRequestHints,
          detailPageStrategy: profile.detailPageStrategy,
          rateLimitPerMinute: profile.rateLimitPerMinute,
          knownIssues: profile.knownIssues,
          domStructureHints: profile.domStructureHints,
          robotsPolicy: profile.robotsPolicy,
          playwrightRequired: profile.playwrightRequired,
          adapterModule: profile.adapterModule,
          estimatedEmployers: profile.estimatedEmployersMorocco,
          estimatedJobsUnlockable: profile.estimatedJobsUnlockable,
        },
        update: {
          displayName: profile.displayName,
          priority: profile.priority,
          detectionConfidence: profile.detectionConfidence,
          authRequired: profile.authRequired,
          paginationStrategy: profile.paginationStrategy,
          apiEndpointPattern: profile.apiEndpointPattern,
          networkRequestHints: profile.networkRequestHints,
          detailPageStrategy: profile.detailPageStrategy,
          rateLimitPerMinute: profile.rateLimitPerMinute,
          knownIssues: profile.knownIssues,
          domStructureHints: profile.domStructureHints,
          robotsPolicy: profile.robotsPolicy,
          playwrightRequired: profile.playwrightRequired,
          adapterModule: profile.adapterModule,
          estimatedEmployers: profile.estimatedEmployersMorocco,
          estimatedJobsUnlockable: profile.estimatedJobsUnlockable,
        },
      });
      seeded++;
    }
    return seeded;
  }

  async updateMetrics(snapshots: PlatformMetricsSnapshot[]): Promise<void> {
    const now = new Date();
    for (const s of snapshots) {
      await this.db.atsPlatformIntelligence.updateMany({
        where: { platform: s.platform },
        data: {
          employerCount: s.employerCount,
          activeEmployerCount: s.activeEmployerCount,
          probedEmployerCount: s.probedEmployerCount,
          jobsCaptured: s.jobsCaptured,
          crawlAttempts: s.crawlAttempts,
          crawlSuccesses: s.crawlSuccesses,
          successRate: s.successRate,
          failureRate: s.failureRate,
          avgCrawlDurationMs: s.avgCrawlDurationMs,
          avgDescriptionQuality: s.avgDescriptionQuality,
          avgEntityExtraction: s.avgEntityExtraction,
          historicalSuccessRate: s.historicalSuccessRate,
          estimatedEmployers: s.estimatedEmployers,
          estimatedJobsUnlockable: s.estimatedJobsUnlockable,
          avgQualityScore: s.avgQualityScore,
          lastMetricsAt: now,
        },
      });
    }
  }

  async updateRoiScores(
    estimates: Array<{ platform: string; roiScore: number }>,
  ): Promise<void> {
    for (const e of estimates) {
      await this.db.atsPlatformIntelligence.updateMany({
        where: { platform: e.platform },
        data: { roiScore: e.roiScore },
      });
    }
  }

  async listAll() {
    return this.db.atsPlatformIntelligence.findMany({
      orderBy: [{ roiScore: 'desc' }, { priority: 'desc' }],
    });
  }

  async getInvestigationSummary() {
    const custom = await this.db.employerAtsIntelligence.findMany({
      where: {
        OR: [
          { atsPlatform: 'custom' },
          { investigationReasons: { isEmpty: false } },
        ],
      },
      select: {
        companyName: true,
        sourceName: true,
        atsPlatform: true,
        investigationReasons: true,
        issues: true,
        careersPageUrl: true,
      },
      orderBy: { probedAt: 'desc' },
      take: 50,
    });

    const reasonCounts = new Map<string, number>();
    for (const row of custom) {
      for (const r of row.investigationReasons) {
        reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
      }
    }

    return { employers: custom, reasonCounts };
  }
}
