/**
 * Sample crawl validation — evaluates jobs before production activation.
 */
import type { Job } from '../types/job.js';
import { validateJob } from './job-validator.js';

export interface SampleValidationReport {
  score: number;
  passed: boolean;
  jobCount: number;
  validJobs: number;
  avgDescriptionLength: number;
  richDescriptionRate: number;
  duplicateRate: number;
  urlValidityRate: number;
  locationQualityRate: number;
  titleQualityRate: number;
  issues: string[];
  details: Record<string, unknown>;
}

const QUALITY_PASS_THRESHOLD = 60;

export function validateSampleCrawl(
  jobs: Job[],
  opts: { minJobs?: number; requireMorocco?: boolean } = {},
): SampleValidationReport {
  const issues: string[] = [];
  const minJobs = opts.minJobs ?? 1;

  if (jobs.length < minJobs) {
    issues.push(`Insufficient jobs: ${jobs.length} < ${minJobs}`);
  }

  const validations = jobs.map((j) => validateJob(j));
  const validJobs = validations.filter((v) => v.accepted).length;
  const titleQualityRate = jobs.length > 0
    ? jobs.filter((j) => j.title.trim().length >= 8).length / jobs.length
    : 0;

  const avgDescriptionLength =
    jobs.length > 0
      ? Math.round(jobs.reduce((a, j) => a + (j.description?.length ?? 0), 0) / jobs.length)
      : 0;

  const rich = jobs.filter((j) => (j.description?.length ?? 0) >= 200).length;
  const richDescriptionRate = jobs.length > 0 ? rich / jobs.length : 0;

  const urlValid = jobs.filter((j) => /^https?:\/\//i.test(j.applicationUrl ?? '')).length;
  const urlValidityRate = jobs.length > 0 ? urlValid / jobs.length : 0;

  const moroccoCities = /casablanca|rabat|marrakech|tanger|agadir|f[eè]s|maroc|morocco|remote/i;
  const locationOk = jobs.filter(
    (j) => j.city?.trim().length >= 2 && (moroccoCities.test(j.city) || moroccoCities.test(j.country ?? '')),
  ).length;
  const locationQualityRate = jobs.length > 0 ? locationOk / jobs.length : 0;

  const seen = new Set<string>();
  let dupes = 0;
  for (const j of jobs) {
    const key = `${j.title.toLowerCase()}|${j.applicationUrl}`;
    if (seen.has(key)) dupes++;
    seen.add(key);
  }
  const duplicateRate = jobs.length > 0 ? dupes / jobs.length : 0;

  if (richDescriptionRate < 0.3 && jobs.length > 2) issues.push('Low description quality');
  if (urlValidityRate < 0.8) issues.push('Invalid application URLs');
  if (locationQualityRate < 0.5 && jobs.length > 2) issues.push('Poor location data');
  if (duplicateRate > 0.2) issues.push('High duplicate rate in sample');

  const score = Math.round(
    (jobs.length > 0 ? Math.min(100, jobs.length * 10) : 0) * 0.2 +
      titleQualityRate * 100 * 0.15 +
      richDescriptionRate * 100 * 0.25 +
      urlValidityRate * 100 * 0.2 +
      locationQualityRate * 100 * 0.15 +
      (1 - duplicateRate) * 100 * 0.05 +
      (validJobs / Math.max(jobs.length, 1)) * 100 * 0.1,
  );

  const passed = score >= QUALITY_PASS_THRESHOLD && jobs.length >= minJobs && issues.length <= 2;

  return {
    score,
    passed,
    jobCount: jobs.length,
    validJobs,
    avgDescriptionLength,
    richDescriptionRate,
    duplicateRate,
    urlValidityRate,
    locationQualityRate,
    titleQualityRate,
    issues,
    details: {
      flagCounts: validations.reduce<Record<string, number>>((acc, v) => {
        for (const f of v.flags) acc[f] = (acc[f] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };
}

export { QUALITY_PASS_THRESHOLD };
