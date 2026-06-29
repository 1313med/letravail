import type { PlatformMetricsSnapshot } from './ats-metrics-engine.js';
import { ATS_PLATFORM_PROFILES, MISSION_ATS_PRIORITY } from './ats-platform-profiles.js';

export interface AtsRoiEstimate {
  platform: string;
  displayName: string;
  priority: number;
  registeredEmployers: number;
  activeEmployers: number;
  inactiveEmployers: number;
  currentJobs: number;
  estimatedJobsUnlockable: number;
  potentialEmployerActivations: number;
  successRate: number;
  adapterMaturity: number;
  roiScore: number;
  recommendation: string;
}

/**
 * ROI = unlockable jobs × inactive employer ratio × adapter gap × mission priority.
 * Higher score = bigger impact from improving this ATS platform once.
 */
export function computeAtsRoi(metrics: PlatformMetricsSnapshot[]): AtsRoiEstimate[] {
  const estimates: AtsRoiEstimate[] = [];

  for (const seed of ATS_PLATFORM_PROFILES) {
    const live = metrics.find((m) => m.platform === seed.platform);
    const registered = live?.employerCount ?? 0;
    const active = live?.activeEmployerCount ?? 0;
    const inactive = Math.max(0, registered - active);
    const currentJobs = live?.jobsCaptured ?? 0;
    const unlockable = live?.estimatedJobsUnlockable ?? seed.estimatedJobsUnlockable;
    const successRate = live?.successRate ?? 0;

    const adapterMaturity = computeAdapterMaturity(seed.platform, successRate, active);
    const inactiveRatio = registered > 0 ? inactive / registered : 1;
    const gapMultiplier = 1 - successRate;

    const priorityWeight = (MISSION_ATS_PRIORITY.indexOf(seed.platform) >= 0
      ? MISSION_ATS_PRIORITY.length - MISSION_ATS_PRIORITY.indexOf(seed.platform)
      : 1) / MISSION_ATS_PRIORITY.length;

    const roiScore = Math.round(
      unlockable * inactiveRatio * gapMultiplier * adapterMaturity * priorityWeight * 10,
    );

    estimates.push({
      platform: seed.platform,
      displayName: seed.displayName,
      priority: seed.priority,
      registeredEmployers: registered,
      activeEmployers: active,
      inactiveEmployers: inactive,
      currentJobs,
      estimatedJobsUnlockable: unlockable,
      potentialEmployerActivations: inactive || seed.estimatedEmployersMorocco - active,
      successRate,
      adapterMaturity,
      roiScore,
      recommendation: buildRecommendation(seed.platform, active, inactive, unlockable, successRate),
    });
  }

  return estimates.sort((a, b) => b.roiScore - a.roiScore);
}

function computeAdapterMaturity(platform: string, successRate: number, activeEmployers: number): number {
  if (platform === 'custom') return 0.3;
  if (activeEmployers >= 2 && successRate > 0.5) return 0.4;
  if (activeEmployers >= 1) return 0.7;
  return 1.0;
}

function buildRecommendation(
  platform: string,
  active: number,
  inactive: number,
  unlockable: number,
  successRate: number,
): string {
  if (platform === 'workday' && inactive > 0) {
    return `Morocco location facet + date parsing — could activate ${inactive} employers, ~${unlockable} jobs`;
  }
  if (platform === 'talentsoft' && successRate < 0.8) {
    return 'Pagination + carriere.*.ma detection — banks still at partial capture';
  }
  if (platform === 'successfactors') {
    return 'Generalize Intelcia API pattern across BPO SuccessFactors instances';
  }
  if (platform === 'custom' && inactive > 10) {
    return 'Playwright network intercept — unlocks BPO sector (Teleperformance, Concentrix, etc.)';
  }
  if (active === 0 && unlockable > 100) {
    return `No active employers yet — adapter build unlocks ~${unlockable} jobs`;
  }
  if (successRate > 0.7) {
    return 'Adapter mature — expand employer registration on this platform';
  }
  return `Improve adapter reliability (${Math.round(successRate * 100)}% success rate)`;
}
