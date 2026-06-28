/**
 * Employer health scoring — 0–100 for ACTIVE/MONITORED sources.
 */
import type { PrismaClient } from '@prisma/client';
import type { EmployerAtsIntelligence, SourceProfile } from '@prisma/client';

export interface HealthReport {
  sourceName: string;
  companyName: string;
  healthScore: number;
  factors: {
    crawlSuccess: number;
    freshness: number;
    jobVolume: number;
    duplicateRate: number;
    validationIssues: number;
    endpointAvailability: number;
  };
  issues: string[];
  needsReprobe: boolean;
  needsDeactivation: boolean;
}

export async function computeEmployerHealth(
  db: PrismaClient,
  intel: EmployerAtsIntelligence,
  profile: SourceProfile | null,
): Promise<HealthReport> {
  const sourceName = intel.sourceName ?? intel.companyName;
  const issues: string[] = [];

  const recentLogs = intel.sourceName
    ? await db.scrapeLog.findMany({
        where: { source: intel.sourceName },
        orderBy: { startedAt: 'desc' },
        take: 10,
      })
    : [];

  const successes = recentLogs.filter((l) => l.status === 'success').length;
  const crawlSuccess = recentLogs.length > 0 ? successes / recentLogs.length : 0.5;
  if (crawlSuccess < 0.5) issues.push('Low crawl success rate');

  const freshness = (profile?.freshnessScore ?? 50) / 100;
  if (freshness < 0.3) issues.push('Stale data');

  const jobVolume = Math.min(1, (profile?.activeJobs ?? 0) / 20);
  if (profile && profile.activeJobs === 0) issues.push('Zero active jobs');

  const duplicateRate = profile?.duplicateRate ?? 0;
  if (duplicateRate > 0.3) issues.push('High duplicate rate');

  const validationIssues =
    intel.validationScore !== null ? Math.max(0, 1 - (intel.issues?.length ?? 0) / 5) : 0.5;

  let endpointAvailability = 0.7;
  if (intel.apiEndpoints.length > 0) {
    const httpEndpoints = intel.apiEndpoints.filter((e) => e.startsWith('http'));
    endpointAvailability = httpEndpoints.length > 0 ? 0.85 : 0.5;
  }
  if (intel.crawlStrategy === 'api' && intel.apiEndpoints.length === 0) {
    endpointAvailability = 0.3;
    issues.push('API strategy without endpoints');
  }

  const healthScore = Math.round(
    crawlSuccess * 100 * 0.25 +
      freshness * 100 * 0.2 +
      jobVolume * 100 * 0.2 +
      (1 - duplicateRate) * 100 * 0.15 +
      validationIssues * 100 * 0.1 +
      endpointAvailability * 100 * 0.1,
  );

  const needsDeactivation = healthScore < 40;
  const needsReprobe =
    healthScore < 50 ||
    (profile?.activeJobs === 0 && recentLogs.length >= 3 && successes === 0) ||
    !intel.robotsAllowed;

  return {
    sourceName,
    companyName: intel.companyName,
    healthScore,
    factors: {
      crawlSuccess,
      freshness,
      jobVolume,
      duplicateRate,
      validationIssues,
      endpointAvailability,
    },
    issues,
    needsReprobe,
    needsDeactivation,
  };
}

export async function refreshHealthForEmployer(
  db: PrismaClient,
  intelId: string,
): Promise<HealthReport | null> {
  const intel = await db.employerAtsIntelligence.findUnique({ where: { id: intelId } });
  if (!intel) return null;

  const profile = intel.sourceName
    ? await db.sourceProfile.findUnique({ where: { sourceName: intel.sourceName } })
    : null;

  const report = await computeEmployerHealth(db, intel, profile);

  await db.employerAtsIntelligence.update({
    where: { id: intelId },
    data: {
      healthScore: report.healthScore,
      lastHealthCheck: new Date(),
    },
  });

  if (intel.sourceName) {
    await db.sourceProfile.update({
      where: { sourceName: intel.sourceName },
      data: {
        healthScore: report.healthScore,
        lastHealthUpdate: new Date(),
      },
    }).catch(() => undefined);
  }

  return report;
}
