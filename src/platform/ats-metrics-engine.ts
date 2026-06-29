import type { PrismaClient } from '@prisma/client';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';
import { ATS_PLATFORM_PROFILES } from './ats-platform-profiles.js';

export interface PlatformMetricsSnapshot {
  platform: string;
  employerCount: number;
  activeEmployerCount: number;
  probedEmployerCount: number;
  jobsCaptured: number;
  crawlAttempts: number;
  crawlSuccesses: number;
  successRate: number;
  failureRate: number;
  avgCrawlDurationMs: number;
  avgDescriptionQuality: number;
  avgEntityExtraction: number;
  historicalSuccessRate: number;
  estimatedEmployers: number;
  estimatedJobsUnlockable: number;
  avgQualityScore: number;
}

export async function computePlatformMetrics(
  db: PrismaClient,
): Promise<PlatformMetricsSnapshot[]> {
  const profiles = await db.sourceProfile.findMany();
  const probes = await db.employerAtsIntelligence.findMany({
    select: { atsPlatform: true, sourceName: true, activationState: true },
  });
  const logs = await db.scrapeLog.findMany({
    where: { startedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    select: {
      source: true,
      durationMs: true,
      jobsFound: true,
      status: true,
    },
  });
  const jobStats = await db.job.groupBy({
    by: ['source'],
    where: { isActive: true },
    _count: true,
    _avg: { qualityScore: true, descriptionScore: true },
  });
  const jobStatsMap = new Map(jobStats.map((j) => [j.source, j]));

  const sourceToAts = new Map<string, string>();
  for (const p of profiles) {
    if (p.atsPlatform) sourceToAts.set(p.sourceName, p.atsPlatform);
  }
  for (const entry of MOROCCO_SOURCE_CATALOG) {
    if (entry.atsPlatform && !sourceToAts.has(entry.sourceName)) {
      sourceToAts.set(entry.sourceName, entry.atsPlatform);
    }
  }

  const platforms = new Set([
    ...ATS_PLATFORM_PROFILES.map((p) => p.platform),
    ...profiles.map((p) => p.atsPlatform).filter(Boolean) as string[],
    ...probes.map((p) => p.atsPlatform),
  ]);

  const snapshots: PlatformMetricsSnapshot[] = [];

  for (const platform of platforms) {
    const sources = profiles.filter(
      (p) => (p.atsPlatform ?? sourceToAts.get(p.sourceName)) === platform,
    );
    const catalogSources = MOROCCO_SOURCE_CATALOG.filter(
      (c) => c.atsPlatform === platform || sourceToAts.get(c.sourceName) === platform,
    );
    const registeredNames = new Set([
      ...sources.map((s) => s.sourceName),
      ...catalogSources.map((c) => c.sourceName),
    ]);

    const activeEmployers = sources.filter((s) => s.activeJobs >= 3).length;
    const jobsCaptured = sources.reduce((sum, s) => sum + s.activeJobs, 0);
    const probedCount = probes.filter((p) => p.atsPlatform === platform).length;

    const platformSources = [...registeredNames];
    const platformLogs = logs.filter((l) => platformSources.includes(l.source));
    const crawlAttempts = platformLogs.length;
    const crawlSuccesses = platformLogs.filter(
      (l) => l.status === 'success' && l.jobsFound > 0,
    ).length;
    const successRate = crawlAttempts > 0 ? crawlSuccesses / crawlAttempts : 0;
    const failureRate = crawlAttempts > 0 ? 1 - successRate : 0;

    const durations = platformLogs.map((l) => l.durationMs).filter((d): d is number => d != null);
    const avgCrawlDurationMs =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const qualityScores: number[] = [];
    const descScores: number[] = [];
    const entityScores: number[] = [];
    for (const name of platformSources) {
      const js = jobStatsMap.get(name);
      if (js?._avg.qualityScore) qualityScores.push(js._avg.qualityScore);
      if (js?._avg.descriptionScore) descScores.push(js._avg.descriptionScore);
      const sp = sources.find((s) => s.sourceName === name);
      if (sp?.skillCoverage) entityScores.push(sp.skillCoverage);
    }

    const inactiveCatalog = catalogSources.filter((c) => {
      const sp = sources.find((s) => s.sourceName === c.sourceName);
      return (sp?.activeJobs ?? 0) < 3;
    });
    const estimatedJobsUnlockable = inactiveCatalog.reduce(
      (sum, c) => sum + (c.estimatedMonthlyJobs ?? 0),
      0,
    );

    const seed = ATS_PLATFORM_PROFILES.find((p) => p.platform === platform);

    snapshots.push({
      platform,
      employerCount: registeredNames.size,
      activeEmployerCount: activeEmployers,
      probedEmployerCount: probedCount,
      jobsCaptured,
      crawlAttempts,
      crawlSuccesses,
      successRate: Math.round(successRate * 1000) / 1000,
      failureRate: Math.round(failureRate * 1000) / 1000,
      avgCrawlDurationMs,
      avgDescriptionQuality: avg(descScores),
      avgEntityExtraction: avg(entityScores),
      historicalSuccessRate: Math.round(successRate * 1000) / 1000,
      estimatedEmployers: seed?.estimatedEmployersMorocco ?? registeredNames.size,
      estimatedJobsUnlockable: Math.max(estimatedJobsUnlockable, seed?.estimatedJobsUnlockable ?? 0),
      avgQualityScore: avg(qualityScores),
    });
  }

  return snapshots.sort((a, b) => b.jobsCaptured - a.jobsCaptured);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
