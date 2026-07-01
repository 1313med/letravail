/**
 * LinkedIn Employer Discovery Engine — Sprint 1.
 * Every LinkedIn crawl discovers new employers, deduplicates, enriches companies,
 * and runs automatic onboarding up to registration.
 */
import type { PrismaClient } from '@prisma/client';
import { MOROCCO_SOURCE_CATALOG } from '../adapters/source-catalog.js';
import { CompanyRepository } from '../repositories/company.repository.js';
import { EmployerDiscoveryRepository } from '../repositories/employer-discovery.repository.js';
import type { LinkedInEmployerHint } from '../scrapers/linkedin/employer-hint.js';
import {
  mergeEmployerHints,
  normalizeEmployerName,
  recommendSourceName,
} from '../scrapers/linkedin/employer-hint.js';
import { fetchLinkedInCompanyProfile } from '../scrapers/linkedin/company-page-fetcher.js';
import { onboardAndPersist } from './employer-onboarding.js';
import { logger } from '../lib/logger.js';

export interface LinkedInDiscoveryReport {
  hintsReceived: number;
  uniqueEmployers: number;
  newDiscoveries: number;
  updatedDiscoveries: number;
  companiesEnriched: number;
  onboarded: number;
  registered: number;
  skippedKnown: number;
  rejectedNoise: number;
  failures: number;
  newEmployers: Array<{
    companyName: string;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    onboardingStatus: string;
    jobCountSeen: number;
  }>;
}

export interface LinkedInDiscoveryOptions {
  /** Run website/ATS probing for new discoveries (default: true) */
  autoOnboard?: boolean;
  /** Max new employers to onboard per crawl (default: 5) */
  onboardLimit?: number;
  /** Skip employers already in catalog/registry (default: true) */
  skipRegistered?: boolean;
}

export class LinkedInEmployerDiscoveryService {
  private readonly discoveryRepo: EmployerDiscoveryRepository;
  private readonly companyRepo: CompanyRepository;

  constructor(private readonly db: PrismaClient) {
    this.discoveryRepo = new EmployerDiscoveryRepository(db);
    this.companyRepo = new CompanyRepository(db);
  }

  async processHints(
    hints: LinkedInEmployerHint[],
    opts: LinkedInDiscoveryOptions = {},
  ): Promise<LinkedInDiscoveryReport> {
    const autoOnboard = opts.autoOnboard !== false;
    const onboardLimit = opts.onboardLimit ?? Number(process.env.LINKEDIN_DISCOVERY_ONBOARD_LIMIT ?? 5);
    const skipRegistered = opts.skipRegistered !== false;

    const merged = mergeEmployerHints(hints);
    const registeredSources = new Set(MOROCCO_SOURCE_CATALOG.map((c) => c.sourceName));

    const report: LinkedInDiscoveryReport = {
      hintsReceived: hints.length,
      uniqueEmployers: merged.length,
      newDiscoveries: 0,
      updatedDiscoveries: 0,
      companiesEnriched: 0,
      onboarded: 0,
      registered: 0,
      skippedKnown: 0,
      rejectedNoise: hints.length - merged.length,
      failures: 0,
      newEmployers: [],
    };

    const sorted = [...merged].sort((a, b) => {
      const jobsA = a.jobIds?.length ?? 0;
      const jobsB = b.jobIds?.length ?? 0;
      if (jobsB !== jobsA) return jobsB - jobsA;
      if (a.websiteUrl && !b.websiteUrl) return -1;
      if (b.websiteUrl && !a.websiteUrl) return 1;
      return 0;
    });

    let onboardedThisRun = 0;

    for (const hint of sorted) {
      const sourceName = recommendSourceName(hint.companyName);

      if (skipRegistered && isKnownCatalogEmployer(hint.companyName, sourceName, registeredSources)) {
        report.skippedKnown++;
        continue;
      }

      const upsert = await this.discoveryRepo.upsertFromHint(hint);

      if (upsert.isNew) {
        report.newDiscoveries++;
        report.newEmployers.push({
          companyName: hint.companyName,
          linkedinUrl: hint.linkedinUrl ?? null,
          websiteUrl: hint.websiteUrl ?? null,
          onboardingStatus: 'discovered',
          jobCountSeen: hint.jobIds?.length ?? 1,
        });
      } else {
        report.updatedDiscoveries++;
      }

      const companyId = await this.enrichCompanyRecord(hint);
      if (companyId) {
        await this.discoveryRepo.linkCompany(upsert.id, companyId);
        report.companiesEnriched++;
      }

      if (!autoOnboard || onboardedThisRun >= onboardLimit) continue;
      if (!upsert.isNew) continue;
      if (upsert.onboardingStatus === 'probed' || upsert.onboardingStatus === 'registered') continue;

      const websiteUrl = await this.resolveWebsiteUrl(hint);
      if (!websiteUrl) continue;

      try {
        const onboardReport = await onboardAndPersist(this.db, websiteUrl, {
          companyName: hint.companyName,
          sourceName,
        });

        const isRegistered = registeredSources.has(sourceName);
        await this.discoveryRepo.markProbed(upsert.id, {
          websiteUrl,
          careersUrl: onboardReport.careersPageUrl ?? undefined,
          atsPlatform: onboardReport.atsDetected,
          probeConfidence: onboardReport.confidenceScore,
          sourceName,
          registered: isRegistered,
        });

        report.onboarded++;
        if (isRegistered) report.registered++;
        onboardedThisRun++;

        logger.info(
          {
            company: hint.companyName,
            ats: onboardReport.atsDetected,
            confidence: onboardReport.confidenceScore,
            careers: onboardReport.careersPageUrl,
          },
          'LinkedIn discovery — employer onboarded',
        );
      } catch (err) {
        report.failures++;
        logger.warn({ err, company: hint.companyName }, 'LinkedIn discovery — onboarding failed');
      }

      await sleep(500);
    }

    logger.info({ ...report, onboardedThisRun }, 'LinkedIn employer discovery pipeline complete');
    return report;
  }

  private async enrichCompanyRecord(hint: LinkedInEmployerHint): Promise<string | null> {
    try {
      return await this.companyRepo.upsert(hint.companyName, {
        linkedinUrl: hint.linkedinUrl,
        websiteUrl: hint.websiteUrl,
        logoUrl: hint.logoUrl,
        industry: hint.industry,
        size: hint.companySize,
        careerPageUrl: hint.careersUrl,
        headquartersCity: hint.headquarters ?? hint.location,
        description: hint.description,
      });
    } catch (err) {
      logger.debug({ err, company: hint.companyName }, 'Company enrichment failed');
      return null;
    }
  }

  private async resolveWebsiteUrl(hint: LinkedInEmployerHint): Promise<string | undefined> {
    if (hint.websiteUrl) return hint.websiteUrl;

    if (hint.linkedinSlug) {
      const profile = await fetchLinkedInCompanyProfile(hint.linkedinSlug);
      if (profile?.websiteUrl) return profile.websiteUrl;
    }

    const slug = normalizeEmployerName(hint.companyName).replace(/\s+/g, '');
    if (slug.length >= 3) {
      return `https://www.${slug}.ma`;
    }

    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fuzzy match against catalog — "Concentrix" matches "Concentrix Maroc". */
function isKnownCatalogEmployer(
  companyName: string,
  sourceName: string,
  registeredSources: Set<string>,
): boolean {
  if (registeredSources.has(sourceName)) return true;

  const norm = normalizeEmployerName(companyName);
  for (const entry of MOROCCO_SOURCE_CATALOG) {
    const catNorm = normalizeEmployerName(entry.companyName);
    if (norm === catNorm) return true;
    if (catNorm.includes(norm) || norm.includes(catNorm)) return true;
    const first = norm.split(' ')[0] ?? '';
    const catFirst = catNorm.split(' ')[0] ?? '';
    if (first.length >= 4 && first === catFirst) return true;
  }
  return false;
}

export async function runLinkedInEmployerDiscovery(
  db: PrismaClient,
  hints: LinkedInEmployerHint[],
  opts?: LinkedInDiscoveryOptions,
): Promise<LinkedInDiscoveryReport> {
  if (process.env.LINKEDIN_DISCOVERY_ENABLED === 'false') {
    logger.info('LinkedIn employer discovery disabled (LINKEDIN_DISCOVERY_ENABLED=false)');
    return {
      hintsReceived: hints.length,
      uniqueEmployers: 0,
      newDiscoveries: 0,
      updatedDiscoveries: 0,
      companiesEnriched: 0,
      onboarded: 0,
      registered: 0,
      skippedKnown: 0,
      rejectedNoise: 0,
      failures: 0,
      newEmployers: [],
    };
  }

  const service = new LinkedInEmployerDiscoveryService(db);
  return service.processHints(hints, opts);
}
