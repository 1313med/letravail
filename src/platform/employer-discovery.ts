/**
 * Automatic employer discovery — find new career pages from seeds and job data.
 */
import { probeCareerSite } from '../adapters/career-site-prober.js';
import { onboardEmployer, onboardAndPersist } from './employer-onboarding.js';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';
import { logger } from '../lib/logger.js';

export interface DiscoveredEmployer {
  companyName: string;
  websiteUrl?: string;
  careersPageUrl?: string;
  atsPlatform: string;
  confidence: number;
  jobCountEstimate: number;
  alreadyRegistered: boolean;
  recommendedSourceName: string;
}

const SEED_DOMAINS = [
  'https://www.intelcia.com',
  'https://www.teleperformance.com',
  'https://www.foundever.com',
  'https://www.concentrix.com',
  'https://www.webhelp.com',
  'https://www.comdatagroup.com',
  'https://bcp-cand.talent-soft.com',
  'https://careers.intelcia.com',
  'https://www.creditdumaroc.ma',
  'https://www.creditagricole.ma',
  'https://www.iam.ma',
  'https://www.orange.ma',
  'https://www.inwi.ma',
  'https://www.ocpgroup.ma',
  'https://www.marjane.ma',
  'https://www.capgemini.com/ma-fr',
  'https://www.accenture.com/ma-fr',
];

export async function discoverEmployers(
  db: import('@prisma/client').PrismaClient,
  opts: { persist?: boolean } = {},
): Promise<DiscoveredEmployer[]> {
  const registered = new Set(MOROCCO_SOURCE_CATALOG.map((c) => c.sourceName));
  const discovered: DiscoveredEmployer[] = [];

  const topCompanies = await db.job.groupBy({
    by: ['company'],
    where: { isActive: true, source: 'linkedin' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 30,
  });

  const seeds = new Set<string>(SEED_DOMAINS);
  for (const { company } of topCompanies) {
    if (company.length < 3) continue;
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
    seeds.add(`https://www.${slug}.ma`);
    seeds.add(`https://www.${slug}.com`);
  }

  for (const url of seeds) {
    try {
      const report = opts.persist
        ? await onboardAndPersist(db, url)
        : await onboardEmployer(url);
      const sourceName = slugify(report.companyName ?? new URL(url).hostname);
      const alreadyRegistered = registered.has(sourceName) ||
        MOROCCO_SOURCE_CATALOG.some((c) => c.companyName.toLowerCase() === (report.companyName ?? '').toLowerCase());

      if (report.confidenceScore < 40) continue;

      discovered.push({
        companyName: report.companyName ?? sourceName,
        websiteUrl: url,
        careersPageUrl: report.careersPageUrl ?? undefined,
        atsPlatform: report.atsDetected,
        confidence: report.confidenceScore,
        jobCountEstimate: report.estimatedJobVolume === 'high' ? 50 : report.estimatedJobVolume === 'medium' ? 15 : 5,
        alreadyRegistered,
        recommendedSourceName: sourceName,
      });

      await sleep(300);
    } catch (err) {
      logger.debug({ err, url }, 'Discovery probe failed');
    }
  }

  return discovered.sort((a, b) => b.confidence - a.confidence);
}

export async function discoverFromPageLinks(careersUrl: string): Promise<string[]> {
  const probe = await probeCareerSite(careersUrl);
  return probe.apiEndpoints;
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
