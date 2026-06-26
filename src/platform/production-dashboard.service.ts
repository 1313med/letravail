/**
 * Production data acquisition dashboard — engineering health per source.
 */
import type { PrismaClient } from '@prisma/client';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';

export interface SourceHealthProfile {
  sourceName: string;
  companyName: string;
  sector: string;
  status: string;
  lastCrawlAt: string | null;
  nextCrawlAt: string | null;
  crawlDurationMs: number | null;
  successRate: number;
  failureRate: number;
  duplicateRate: number;
  jobsDiscovered: number;
  activeJobs: number;
  archivedJobs: number;
  richDescriptionPct: number;
  skillExtractionPct: number;
  experienceExtractionPct: number;
  avgQualityScore: number;
  freshnessScore: number;
  intelligenceScore: number;
  atsPlatform: string | null;
  catalogStatus: string;
  neverCrawled: boolean;
  issues: string[];
}

export interface ProductionDashboard {
  generatedAt: string;
  scale: { totalActive: number; totalArchived: number; totalEmployers: number; totalCities: number };
  sources: SourceHealthProfile[];
  productionReady: number;
  needsActivation: number;
  broken: number;
  recommendations: string[];
}

export class ProductionDashboardService {
  constructor(private readonly db: PrismaClient) {}

  async generate(): Promise<ProductionDashboard> {
    const profiles = await this.db.sourceProfile.findMany({
      orderBy: [{ intelligenceScore: 'desc' }, { sourceName: 'asc' }],
    });

    const registryNames = new Set(profiles.map((p) => p.sourceName));
    const sources: SourceHealthProfile[] = [];

    for (const profile of profiles) {
      const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === profile.sourceName);
      const health = await this.buildSourceHealth(profile.sourceName, profile, catalog);
      sources.push(health);
    }

    for (const entry of MOROCCO_SOURCE_CATALOG) {
      if (registryNames.has(entry.sourceName) || entry.sourceName === 'linkedin') continue;
      sources.push({
        sourceName: entry.sourceName,
        companyName: entry.companyName,
        sector: entry.sector,
        status: 'not_registered',
        lastCrawlAt: null,
        nextCrawlAt: null,
        crawlDurationMs: null,
        successRate: 0,
        failureRate: 0,
        duplicateRate: 0,
        jobsDiscovered: 0,
        activeJobs: 0,
        archivedJobs: 0,
        richDescriptionPct: 0,
        skillExtractionPct: 0,
        experienceExtractionPct: 0,
        avgQualityScore: 0,
        freshnessScore: 0,
        intelligenceScore: 0,
        atsPlatform: entry.atsPlatform ?? null,
        catalogStatus: entry.status,
        neverCrawled: true,
        issues: ['Not registered in scraper registry'],
      });
    }

    const [totalActive, totalArchived, employerCount, cityCount] = await Promise.all([
      this.db.job.count({ where: { isActive: true } }),
      this.db.job.count({ where: { isActive: false } }),
      this.db.job.groupBy({ by: ['company'], where: { isActive: true } }).then((r) => r.length),
      this.db.job.groupBy({ by: ['city'], where: { isActive: true } }).then((r) => r.length),
    ]);

    const productionReady = sources.filter((s) => s.activeJobs >= 5 && s.richDescriptionPct >= 70).length;
    const needsActivation = sources.filter((s) => s.neverCrawled || s.activeJobs === 0).length;
    const broken = sources.filter((s) => s.status === 'broken' || s.status === 'maintenance').length;

    const recommendations = this.buildRecommendations(sources, needsActivation, broken);

    return {
      generatedAt: new Date().toISOString(),
      scale: { totalActive, totalArchived, totalEmployers: employerCount, totalCities: cityCount },
      sources,
      productionReady,
      needsActivation,
      broken,
      recommendations,
    };
  }

  private async buildSourceHealth(
    sourceName: string,
    profile: {
      sourceName: string;
      companyName: string;
      status: string;
      lastCrawlAt: Date | null;
      nextCrawlAt: Date | null;
      avgCrawlDurationMs: number | null;
      failureRate: number | null;
      duplicateRate: number | null;
      jobsDiscovered: number;
      activeJobs: number;
      archivedJobs: number;
      intelligenceScore: number | null;
      freshnessScore: number | null;
      atsPlatform: string | null;
    },
    catalog?: (typeof MOROCCO_SOURCE_CATALOG)[number],
  ): Promise<SourceHealthProfile> {
    const logs = await this.db.scrapeLog.findMany({
      where: { source: sourceName },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const successes = logs.filter((l) => l.status === 'success' || l.status === 'partial').length;
    const successRate = logs.length > 0 ? successes / logs.length : 0;
    const neverCrawled = logs.length === 0;

    const jobs = await this.db.job.findMany({
      where: { source: sourceName, isActive: true },
      select: {
        description: true,
        title: true,
        qualityScore: true,
        experienceLevel: true,
        experienceYears: true,
        skills: { select: { skillId: true } },
      },
      take: 300,
    });

    const rich = jobs.filter((j) => j.description.length >= 500).length;
    const withSkills = jobs.filter((j) => j.skills.length > 0).length;
    const withExp = jobs.filter((j) => j.experienceLevel || j.experienceYears).length;
    const avgQuality =
      jobs.length > 0
        ? jobs.reduce((a, j) => a + (j.qualityScore ?? 0), 0) / jobs.length
        : 0;

    const issues: string[] = [];
    if (neverCrawled) issues.push('Never crawled in production');
    if (profile.activeJobs === 0 && !neverCrawled) issues.push('Zero active jobs after crawl');
    if (jobs.length > 0 && rich / jobs.length < 0.5) issues.push('Low rich description rate');
    if (jobs.length > 0 && withSkills / jobs.length < 0.3) issues.push('Low skill extraction');
    if ((profile.failureRate ?? 0) > 0.4) issues.push('High failure rate');

    return {
      sourceName,
      companyName: catalog?.companyName ?? profile.companyName,
      sector: catalog?.sector ?? 'unknown',
      status: profile.status,
      lastCrawlAt: profile.lastCrawlAt?.toISOString() ?? null,
      nextCrawlAt: profile.nextCrawlAt?.toISOString() ?? null,
      crawlDurationMs: profile.avgCrawlDurationMs,
      successRate: Math.round(successRate * 1000) / 10,
      failureRate: Math.round((profile.failureRate ?? 0) * 1000) / 10,
      duplicateRate: Math.round((profile.duplicateRate ?? 0) * 1000) / 10,
      jobsDiscovered: profile.jobsDiscovered,
      activeJobs: profile.activeJobs,
      archivedJobs: profile.archivedJobs,
      richDescriptionPct: jobs.length > 0 ? Math.round((rich / jobs.length) * 1000) / 10 : 0,
      skillExtractionPct: jobs.length > 0 ? Math.round((withSkills / jobs.length) * 1000) / 10 : 0,
      experienceExtractionPct: jobs.length > 0 ? Math.round((withExp / jobs.length) * 1000) / 10 : 0,
      avgQualityScore: Math.round(avgQuality * 10) / 10,
      freshnessScore: profile.freshnessScore ?? 0,
      intelligenceScore: profile.intelligenceScore ?? 0,
      atsPlatform: profile.atsPlatform ?? catalog?.atsPlatform ?? null,
      catalogStatus: catalog?.status ?? 'unknown',
      neverCrawled,
      issues,
    };
  }

  private buildRecommendations(
    sources: SourceHealthProfile[],
    needsActivation: number,
    broken: number,
  ): string[] {
    const recs: string[] = [];

    if (needsActivation > 0) {
      recs.push(`Activate ${needsActivation} sources with 0 jobs — run: npm run activate:production`);
    }

    const priority = sources
      .filter((s) => s.neverCrawled || s.activeJobs === 0)
      .filter((s) => ['banks', 'bpo'].includes(s.sector))
      .slice(0, 5);

    for (const s of priority) {
      recs.push(`Priority activation: ${s.sourceName} (${s.companyName})`);
    }

    if (broken > 0) recs.push(`${broken} sources in maintenance/broken — investigate crawl logs`);

    const weakQuality = sources.filter((s) => s.activeJobs > 0 && s.richDescriptionPct < 50);
    for (const s of weakQuality.slice(0, 3)) {
      recs.push(`${s.sourceName}: improve description quality (${s.richDescriptionPct}% rich)`);
    }

    return recs;
  }
}
