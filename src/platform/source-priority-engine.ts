/**
 * Dynamic source priority — drives adaptive crawl frequency.
 */
import type { SourceProfile } from '@prisma/client';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';

export interface PriorityFactors {
  freshness: number;
  hiringFrequency: number;
  jobVolume: number;
  descriptionQuality: number;
  extractionQuality: number;
  employerImportance: number;
  updateFrequency: number;
  duplicatePenalty: number;
  reliability: number;
}

export interface SourcePriorityResult {
  sourceName: string;
  priorityScore: number;
  recommendedIntervalMinutes: number;
  factors: PriorityFactors;
  tier: 'critical' | 'high' | 'medium' | 'low' | 'dormant';
}

const SECTOR_WEIGHT: Record<string, number> = {
  bpo: 1.0,
  banks: 0.95,
  telecom: 0.85,
  consulting: 0.8,
  technology: 0.75,
  retail: 0.65,
  government: 0.6,
  automotive: 0.55,
  airlines: 0.5,
};

export function computeSourcePriority(profile: SourceProfile): SourcePriorityResult {
  const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === profile.sourceName);
  const sector = catalog?.sector ?? 'unknown';
  const sectorBoost = SECTOR_WEIGHT[sector] ?? 0.5;

  const freshness = (profile.freshnessScore ?? 50) / 100;
  const hiringFrequency = Math.min(1, (profile.avgDailyAdditions ?? 0) / 3);
  const jobVolume = Math.min(1, profile.activeJobs / 30);
  const descriptionQuality = Math.min(1, (profile.avgDescriptionLength ?? 0) / 800);
  const extractionQuality = ((profile.skillCoverage ?? 0) + (profile.experienceCoverage ?? 0)) / 2;
  const employerImportance = Math.min(1, (catalog?.priority ?? 40) / 100) * sectorBoost;
  const updateFrequency = profile.lastCrawlAt
    ? Math.max(0, 1 - (Date.now() - profile.lastCrawlAt.getTime()) / (7 * 86_400_000))
    : 0.5;
  const duplicatePenalty = Math.min(1, profile.duplicateRate ?? 0);
  const reliability = 1 - (profile.failureRate ?? 0);

  const probeBoost = (profile.probeConfidence ?? 0) >= 70 ? 0.1 : 0;
  const strategyBoost = profile.crawlStrategy === 'api' ? 0.08 : 0;
  const healthBoost = ((profile.healthScore ?? 50) / 100) * 0.1;
  const activationBoost =
    profile.activationState === 'ACTIVE' || profile.activationState === 'MONITORED' ? 0.05 : 0;

  const factors: PriorityFactors = {
    freshness,
    hiringFrequency,
    jobVolume,
    descriptionQuality,
    extractionQuality,
    employerImportance,
    updateFrequency,
    duplicatePenalty,
    reliability,
  };

  const raw =
    freshness * 0.15 +
    hiringFrequency * 0.12 +
    jobVolume * 0.18 +
    descriptionQuality * 0.12 +
    extractionQuality * 0.1 +
    employerImportance * 0.15 +
    updateFrequency * 0.08 +
    reliability * 0.1 -
    duplicatePenalty * 0.1 +
    probeBoost +
    strategyBoost +
    healthBoost +
    activationBoost;

  const priorityScore = Math.round(Math.max(0, Math.min(100, raw * 100)));
  const tier = scoreToTier(priorityScore, profile.activeJobs);
  const recommendedIntervalMinutes = tierToInterval(tier, profile.crawlStrategy);

  return {
    sourceName: profile.sourceName,
    priorityScore,
    recommendedIntervalMinutes,
    factors,
    tier,
  };
}

export async function refreshAllPriorities(db: import('@prisma/client').PrismaClient): Promise<SourcePriorityResult[]> {
  const profiles = await db.sourceProfile.findMany({ where: { status: { in: ['active', 'stale', 'maintenance'] } } });
  const results: SourcePriorityResult[] = [];

  for (const profile of profiles) {
    const result = computeSourcePriority(profile);
    results.push(result);
    await db.sourceProfile.update({
      where: { sourceName: profile.sourceName },
      data: {
        priorityScore: result.priorityScore,
        crawlIntervalMinutes: result.recommendedIntervalMinutes,
      },
    });
  }

  return results.sort((a, b) => b.priorityScore - a.priorityScore);
}

function scoreToTier(score: number, activeJobs: number): SourcePriorityResult['tier'] {
  if (activeJobs === 0 && score < 30) return 'dormant';
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function tierToInterval(tier: SourcePriorityResult['tier'], strategy: string | null): number {
  const api = strategy === 'api';
  switch (tier) {
    case 'critical':
      return api ? 60 : 120;
    case 'high':
      return api ? 120 : 240;
    case 'medium':
      return 360;
    case 'low':
      return 720;
    case 'dormant':
      return 1440;
  }
}
