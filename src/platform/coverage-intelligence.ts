/**
 * Market coverage intelligence — estimates vs captured jobs by sector, city, employer.
 */
import type { PrismaClient } from '@prisma/client';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';

export interface SectorCoverage {
  sector: string;
  estimatedMonthlyJobs: number;
  capturedActiveJobs: number;
  coveragePercent: number;
  sourcesActive: number;
  sourcesTotal: number;
  topEmployers: Array<{ name: string; jobs: number }>;
}

export interface CityCoverage {
  city: string;
  activeJobs: number;
  employers: number;
  sharePercent: number;
}

export interface MarketCoverageReport {
  generatedAt: string;
  totalActiveJobs: number;
  totalEstimatedMarket: number;
  overallCoveragePercent: number;
  sectors: SectorCoverage[];
  cities: CityCoverage[];
  employers: Array<{ company: string; jobs: number; sources: string[] }>;
  professions: Array<{ title: string; count: number }>;
  byAts: Array<{ platform: string; sources: number; activeJobs: number }>;
  gaps: string[];
}

const SECTOR_LABELS: Record<string, string> = {
  banks: 'Banking',
  bpo: 'Call Centers / BPO',
  telecom: 'Telecom',
  technology: 'IT & Technology',
  consulting: 'Consulting',
  retail: 'Retail',
  automotive: 'Automotive & Industry',
  industry: 'Industry & Mining',
  government: 'Public Sector',
  aviation: 'Aviation',
  transport: 'Transport',
  aggregator: 'Aggregators',
};

export async function generateMarketCoverage(db: PrismaClient): Promise<MarketCoverageReport> {
  const totalActive = await db.job.count({ where: { isActive: true } });

  const sectorMap = new Map<string, { estimated: number; sources: Set<string>; activeSources: Set<string> }>();
  for (const entry of MOROCCO_SOURCE_CATALOG) {
    const s = entry.sector;
    const cur = sectorMap.get(s) ?? { estimated: 0, sources: new Set(), activeSources: new Set() };
    cur.estimated += entry.estimatedMonthlyJobs;
    cur.sources.add(entry.sourceName);
    if (entry.status === 'active') cur.activeSources.add(entry.sourceName);
    sectorMap.set(s, cur);
  }

  const sectors: SectorCoverage[] = [];
  for (const [sector, meta] of sectorMap) {
    const sourceNames = [...meta.sources];
    const captured = await db.job.count({
      where: { isActive: true, source: { in: sourceNames } },
    });

    const topEmployers = await db.job.groupBy({
      by: ['company'],
      where: { isActive: true, source: { in: sourceNames } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    sectors.push({
      sector: SECTOR_LABELS[sector] ?? sector,
      estimatedMonthlyJobs: meta.estimated,
      capturedActiveJobs: captured,
      coveragePercent: meta.estimated > 0 ? Math.round((captured / meta.estimated) * 1000) / 10 : 0,
      sourcesActive: meta.activeSources.size,
      sourcesTotal: meta.sources.size,
      topEmployers: topEmployers.map((e) => ({ name: e.company, jobs: e._count.id })),
    });
  }

  sectors.sort((a, b) => b.estimatedMonthlyJobs - a.estimatedMonthlyJobs);

  const totalEstimated = sectors.reduce((a, s) => a + s.estimatedMonthlyJobs, 0);

  const cityGroups = await db.job.groupBy({
    by: ['city'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const cities: CityCoverage[] = cityGroups.map((c) => ({
    city: c.city,
    activeJobs: c._count.id,
    employers: 0,
    sharePercent: totalActive > 0 ? Math.round((c._count.id / totalActive) * 1000) / 10 : 0,
  }));

  for (const city of cities.slice(0, 10)) {
    const empCount = await db.job.groupBy({
      by: ['company'],
      where: { isActive: true, city: city.city },
    });
    city.employers = empCount.length;
  }

  const employerGroups = await db.job.groupBy({
    by: ['company', 'source'],
    where: { isActive: true },
    _count: { id: true },
  });

  const employerMap = new Map<string, { jobs: number; sources: Set<string> }>();
  for (const row of employerGroups) {
    const cur = employerMap.get(row.company) ?? { jobs: 0, sources: new Set() };
    cur.jobs += row._count.id;
    cur.sources.add(row.source);
    employerMap.set(row.company, cur);
  }

  const employers = [...employerMap.entries()]
    .map(([company, data]) => ({ company, jobs: data.jobs, sources: [...data.sources] }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 30);

  const titleGroups = await db.job.groupBy({
    by: ['title'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 25,
  });

  const professions = titleGroups.map((t) => ({ title: t.title, count: t._count.id }));

  const profiles = await db.sourceProfile.findMany({ where: { atsPlatform: { not: null } } });
  const byAtsMap = new Map<string, { sources: number; jobs: number }>();
  for (const p of profiles) {
    const platform = p.atsPlatform ?? 'unknown';
    const cur = byAtsMap.get(platform) ?? { sources: 0, jobs: 0 };
    cur.sources++;
    cur.jobs += p.activeJobs;
    byAtsMap.set(platform, cur);
  }

  const byAts = [...byAtsMap.entries()]
    .map(([platform, data]) => ({ platform, sources: data.sources, activeJobs: data.jobs }))
    .sort((a, b) => b.activeJobs - a.activeJobs);

  const gaps: string[] = [];
  for (const s of sectors) {
    if (s.coveragePercent < 10 && s.estimatedMonthlyJobs >= 50) {
      gaps.push(`${s.sector}: ${s.coveragePercent}% coverage (${s.capturedActiveJobs}/${s.estimatedMonthlyJobs} est.) — activate ${s.sourcesTotal - s.sourcesActive} planned sources`);
    }
  }

  const zeroJobSources = await db.sourceProfile.findMany({
    where: { status: 'active', activeJobs: 0 },
    select: { sourceName: true },
  });
  if (zeroJobSources.length > 0) {
    gaps.push(`${zeroJobSources.length} registered sources have 0 active jobs — run production activation`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalActiveJobs: totalActive,
    totalEstimatedMarket: totalEstimated,
    overallCoveragePercent: totalEstimated > 0 ? Math.round((totalActive / totalEstimated) * 1000) / 10 : 0,
    sectors,
    cities,
    employers,
    professions,
    byAts,
    gaps,
  };
}
