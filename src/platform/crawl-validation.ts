/**
 * Post-crawl platform validation — health metrics after every scrape run.
 */
import type { PrismaClient } from '@prisma/client';
import type { PersistResult, ScrapeRunStats } from '../types/job.js';
import { findCrossSourceDuplicates } from './duplicate-detector.js';

export interface CrawlValidationReport {
  source: string;
  crawledAt: string;
  jobsFound: number;
  inserted: number;
  updated: number;
  duplicates: number;
  expiredArchived: number;
  unverifiedArchived: number;
  avgDescriptionLength: number;
  richDescriptionRate: number;
  skillCoverage: number;
  entityCoverage: number;
  employerCount: number;
  cityCount: number;
  crossSourceDuplicates: number;
  freshnessScore: number;
  intelligenceScore: number;
  status: 'healthy' | 'degraded' | 'broken';
  issues: string[];
}

export async function buildCrawlValidationReport(
  db: PrismaClient,
  stats: ScrapeRunStats,
  persist: PersistResult,
  extras?: { expiredArchived?: number; unverifiedArchived?: number },
): Promise<CrawlValidationReport> {
  const source = stats.source;
  const issues: string[] = [];

  const jobs = await db.job.findMany({
    where: { source, isActive: true },
    select: {
      description: true,
      title: true,
      city: true,
      company: true,
      extractionMetadata: true,
      skills: { select: { skillId: true } },
    },
    take: 500,
  });

  const avgDescriptionLength =
    jobs.length > 0
      ? Math.round(jobs.reduce((a, j) => a + j.description.length, 0) / jobs.length)
      : 0;

  const rich = jobs.filter((j) => j.description.length >= 500).length;
  const richDescriptionRate = jobs.length > 0 ? rich / jobs.length : 0;

  const withSkills = jobs.filter((j) => j.skills.length > 0).length;
  const skillCoverage = jobs.length > 0 ? withSkills / jobs.length : 0;

  const withEntities = jobs.filter((j) => {
    const meta = j.extractionMetadata as { entityCoverage?: { score?: number } } | null;
    return (meta?.entityCoverage?.score ?? 0) >= 30;
  }).length;
  const entityCoverage = jobs.length > 0 ? withEntities / jobs.length : 0;

  const employers = new Set(jobs.map((j) => j.company.toLowerCase())).size;
  const cities = new Set(jobs.map((j) => j.city.toLowerCase())).size;

  const crossDupes = await findCrossSourceDuplicates(db, 20);

  const profile = await db.sourceProfile.findUnique({ where: { sourceName: source } });

  if (richDescriptionRate < 0.5 && jobs.length > 5) issues.push('Low description richness');
  if (skillCoverage < 0.3 && jobs.length > 5) issues.push('Low skill extraction');
  if (stats.status === 'failed') issues.push('Crawl failed');
  if (stats.jobsFound === 0) issues.push('Zero jobs discovered');

  const intelligenceScore = profile?.intelligenceScore ?? 0;
  const freshnessScore = profile?.freshnessScore ?? 0;

  let status: CrawlValidationReport['status'] = 'healthy';
  if (stats.status === 'failed' || stats.jobsFound === 0) status = 'broken';
  else if (issues.length > 0 || richDescriptionRate < 0.7) status = 'degraded';

  return {
    source,
    crawledAt: new Date().toISOString(),
    jobsFound: stats.jobsFound,
    inserted: persist.inserted,
    updated: persist.updated,
    duplicates: persist.duplicates,
    expiredArchived: extras?.expiredArchived ?? 0,
    unverifiedArchived: extras?.unverifiedArchived ?? 0,
    avgDescriptionLength,
    richDescriptionRate: Math.round(richDescriptionRate * 1000) / 10,
    skillCoverage: Math.round(skillCoverage * 1000) / 10,
    entityCoverage: Math.round(entityCoverage * 1000) / 10,
    employerCount: employers,
    cityCount: cities,
    crossSourceDuplicates: crossDupes.length,
    freshnessScore,
    intelligenceScore,
    status,
    issues,
  };
}
