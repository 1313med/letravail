import type { PrismaClient } from '@prisma/client';

export interface PlatformDashboard {
  generatedAt: string;
  jobs: { total: number; active: number; archived: number };
  companies: { total: number; enriched: number };
  sources: Array<{
    sourceName: string;
    status: string;
    activeJobs: number;
    intelligenceScore: number | null;
    freshnessScore: number | null;
    skillCoverage: number | null;
    avgDescriptionLength: number | null;
    lastCrawlAt: string | null;
    nextCrawlAt: string | null;
  }>;
  quality: {
    avgJobQuality: number;
    avgDescriptionLength: number;
    skillCoverage: number;
    companyEnrichment: number;
  };
  recommendations: string[];
}

export class QualityDashboardService {
  constructor(private readonly db: PrismaClient) {}

  async generate(): Promise<PlatformDashboard> {
    const [totalJobs, activeJobs, archivedJobs, totalCompanies, enrichedCompanies] =
      await Promise.all([
        this.db.job.count(),
        this.db.job.count({ where: { isActive: true } }),
        this.db.job.count({ where: { isActive: false } }),
        this.db.company.count(),
        this.db.company.count({
          where: {
            OR: [
              { websiteUrl: { not: null } },
              { industry: { not: null } },
              { linkedinUrl: { not: null } },
            ],
          },
        }),
      ]);

    const sources = await this.db.sourceProfile.findMany({ orderBy: { intelligenceScore: 'desc' } });

    const qualityAgg = await this.db.job.aggregate({
      where: { isActive: true },
      _avg: { qualityScore: true },
    });

    const withSkills = await this.db.job.count({
      where: { isActive: true, skills: { some: {} } },
    });

    const descJobs = await this.db.job.findMany({
      where: { isActive: true },
      select: { description: true },
      take: 500,
    });
    const avgDesc =
      descJobs.length > 0
        ? Math.round(descJobs.reduce((a, j) => a + j.description.length, 0) / descJobs.length)
        : 0;

    const recommendations: string[] = [];
    for (const s of sources) {
      if (s.status === 'stale') recommendations.push(`${s.sourceName}: stale — investigate crawler`);
      if (s.status === 'maintenance') recommendations.push(`${s.sourceName}: high failure rate — needs maintenance`);
      if ((s.avgDescriptionLength ?? 0) < 200) recommendations.push(`${s.sourceName}: low description quality`);
      if ((s.skillCoverage ?? 0) < 0.3) recommendations.push(`${s.sourceName}: low skill extraction`);
    }

    const weakest = [...sources].sort((a, b) => (a.intelligenceScore ?? 0) - (b.intelligenceScore ?? 0)).slice(0, 3);
    const strongest = sources.slice(0, 3);

    if (weakest.length > 0) {
      recommendations.push(`Weakest sources: ${weakest.map((s) => s.sourceName).join(', ')}`);
    }
    if (strongest.length > 0) {
      recommendations.push(`Best sources: ${strongest.map((s) => s.sourceName).join(', ')}`);
    }

    return {
      generatedAt: new Date().toISOString(),
      jobs: { total: totalJobs, active: activeJobs, archived: archivedJobs },
      companies: { total: totalCompanies, enriched: enrichedCompanies },
      sources: sources.map((s) => ({
        sourceName: s.sourceName,
        status: s.status,
        activeJobs: s.activeJobs,
        intelligenceScore: s.intelligenceScore,
        freshnessScore: s.freshnessScore,
        skillCoverage: s.skillCoverage,
        avgDescriptionLength: s.avgDescriptionLength,
        lastCrawlAt: s.lastCrawlAt?.toISOString() ?? null,
        nextCrawlAt: s.nextCrawlAt?.toISOString() ?? null,
      })),
      quality: {
        avgJobQuality: Math.round(qualityAgg._avg.qualityScore ?? 0),
        avgDescriptionLength: avgDesc,
        skillCoverage: activeJobs > 0 ? withSkills / activeJobs : 0,
        companyEnrichment: totalCompanies > 0 ? enrichedCompanies / totalCompanies : 0,
      },
      recommendations,
    };
  }
}
