/**
 * Automated employer onboarding — probe company website and recommend crawl strategy.
 */
import { probeCareerSite } from '../adapters/career-site-prober.js';
import type { AtsPlatform } from '../adapters/ats-registry.js';
import type { PrismaClient } from '@prisma/client';
import { AtsIntelligenceRepository } from '../repositories/ats-intelligence.repository.js';

export interface EmployerOnboardingReport {
  inputUrl: string;
  companyName?: string;
  careersPageUrl: string | null;
  confidenceScore: number;
  atsDetected: AtsPlatform;
  estimatedJobVolume: 'low' | 'medium' | 'high' | 'unknown';
  technicalComplexity: 'low' | 'medium' | 'high';
  crawlStrategy: 'api' | 'hybrid' | 'dom' | 'manual';
  recommendedAdapter: string;
  maintenanceEffort: 'low' | 'medium' | 'high';
  robotsAllowed: boolean;
  sitemapUrls: string[];
  apiEndpoints: string[];
  greenhouseToken?: string;
  leverSlug?: string;
  workdayConfig?: { host: string; tenant: string; site: string };
  graphqlDetected: boolean;
  structuredData: boolean;
  issues: string[];
  nextSteps: string[];
}

const CAREER_PATH_PATTERNS = [
  '/carrieres', '/carrières', '/careers', '/jobs', '/recrutement', '/emploi',
  '/nous-rejoindre', '/join-us', '/work-with-us', '/offres-emploi',
];

const CAREER_LINK_RE = /carrieres|carrières|careers|recrutement|emploi|jobs|nous-rejoindre|join[\s-]?us/i;

export async function onboardEmployer(
  websiteUrl: string,
  companyName?: string,
): Promise<EmployerOnboardingReport> {
  const issues: string[] = [];
  const nextSteps: string[] = [];

  let homepageHtml = '';
  let finalUrl = websiteUrl;

  try {
    const res = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'LetravailScraper/1.0', Accept: 'text/html' },
      redirect: 'follow',
    });
    finalUrl = res.url;
    homepageHtml = await res.text();
  } catch {
    issues.push('Could not fetch company homepage');
  }

  const careersPageUrl = discoverCareersPage(finalUrl, homepageHtml);
  const probeTarget = careersPageUrl ?? websiteUrl;
  const probe = await probeCareerSite(probeTarget);

  const graphqlDetected = /graphql|__NEXT_DATA__|"query"\s*:/i.test(probe.finalUrl ? homepageHtml : '');
  const structuredData = /application\/ld\+json|JobPosting/i.test(homepageHtml);

  let atsDetected = probe.atsPlatform;
  if (probe.greenhouseToken) atsDetected = 'greenhouse';
  if (probe.leverSlug) atsDetected = 'lever';
  if (probe.workdayConfig) atsDetected = 'workday';
  if (probe.finalUrl.includes('talent-soft.com') || probe.apiEndpoints.some((e) => /talent-soft/i.test(e))) {
    atsDetected = 'talentsoft';
  }
  if (probe.apiEndpoints.some((e) => /intelcia\.com\/api/i.test(e))) atsDetected = 'successfactors';

  const { strategy, adapter, complexity, maintenance } = resolveStrategy(atsDetected, probe);

  const estimatedJobVolume = estimateVolume(atsDetected, probe.apiEndpoints.length);

  let confidence = 40;
  if (careersPageUrl) confidence += 20;
  if (atsDetected !== 'custom') confidence += 25;
  if (probe.apiEndpoints.length > 0) confidence += 10;
  if (probe.robotsAllowed) confidence += 5;
  if (structuredData) confidence += 5;
  confidence = Math.min(100, confidence);

  if (!careersPageUrl) {
    issues.push('No careers page link found on homepage');
    nextSteps.push('Manually locate careers URL and re-run onboarding');
  }
  if (!probe.robotsAllowed) issues.push('robots.txt may restrict crawling');
  if (atsDetected === 'custom') {
    nextSteps.push('Inspect page for hidden API calls (Network tab)');
    nextSteps.push('Try generic DOM scraper with detail fetch');
  }
  if (probe.greenhouseToken) nextSteps.push(`Register Greenhouse board: ${probe.greenhouseToken}`);
  if (probe.leverSlug) nextSteps.push(`Register Lever slug: ${probe.leverSlug}`);
  if (probe.workdayConfig) {
    nextSteps.push(`Configure Workday: host=${probe.workdayConfig.host}, site=${probe.workdayConfig.site}`);
  }
  if (strategy === 'api') nextSteps.push('Register in source catalog — config-only onboarding');
  if (atsDetected === 'talentsoft') nextSteps.push('Use talentsoft.adapter.ts with listing URL');

  return {
    inputUrl: websiteUrl,
    companyName,
    careersPageUrl,
    confidenceScore: confidence,
    atsDetected,
    estimatedJobVolume,
    technicalComplexity: complexity,
    crawlStrategy: strategy,
    recommendedAdapter: adapter,
    maintenanceEffort: maintenance,
    robotsAllowed: probe.robotsAllowed,
    sitemapUrls: probe.sitemapUrls,
    apiEndpoints: probe.apiEndpoints,
    greenhouseToken: probe.greenhouseToken,
    leverSlug: probe.leverSlug,
    workdayConfig: probe.workdayConfig,
    graphqlDetected,
    structuredData,
    issues,
    nextSteps,
  };
}

function discoverCareersPage(baseUrl: string, html: string): string | null {
  const origin = new URL(baseUrl).origin;

  const hrefMatches = html.matchAll(/href=["']([^"']+)["'][^>]*>([^<]{0,80})/gi);
  for (const match of hrefMatches) {
    const href = match[1]!;
    const text = match[2] ?? '';
    if (CAREER_LINK_RE.test(href) || CAREER_LINK_RE.test(text)) {
      try {
        return new URL(href, origin).href;
      } catch {
        continue;
      }
    }
  }

  for (const path of CAREER_PATH_PATTERNS) {
    try {
      return new URL(path, origin).href;
    } catch {
      continue;
    }
  }

  return null;
}

function resolveStrategy(
  ats: AtsPlatform,
  probe: Awaited<ReturnType<typeof probeCareerSite>>,
): {
  strategy: EmployerOnboardingReport['crawlStrategy'];
  adapter: string;
  complexity: EmployerOnboardingReport['technicalComplexity'];
  maintenance: EmployerOnboardingReport['maintenanceEffort'];
} {
  if (ats === 'greenhouse') return { strategy: 'api', adapter: 'greenhouse.adapter.ts', complexity: 'low', maintenance: 'low' };
  if (ats === 'lever') return { strategy: 'api', adapter: 'lever.adapter.ts', complexity: 'low', maintenance: 'low' };
  if (ats === 'workday') return { strategy: 'api', adapter: 'workday.adapter.ts', complexity: 'medium', maintenance: 'low' };
  if (ats === 'talentsoft') return { strategy: 'hybrid', adapter: 'talentsoft.adapter.ts', complexity: 'medium', maintenance: 'low' };
  if (ats === 'successfactors') return { strategy: 'hybrid', adapter: 'intelcia.adapter.ts / custom API', complexity: 'medium', maintenance: 'medium' };
  if (ats === 'csod') return { strategy: 'api', adapter: 'attijariwafa pattern', complexity: 'medium', maintenance: 'medium' };
  if (ats === 'smartrecruiters') return { strategy: 'api', adapter: 'smartrecruiters.adapter.ts', complexity: 'medium', maintenance: 'medium' };
  if (probe.apiEndpoints.length > 0) return { strategy: 'hybrid', adapter: 'ats-career-scraper.ts', complexity: 'medium', maintenance: 'medium' };
  return { strategy: 'dom', adapter: 'generic.scraper.ts', complexity: 'high', maintenance: 'high' };
}

function estimateVolume(ats: AtsPlatform, apiCount: number): EmployerOnboardingReport['estimatedJobVolume'] {
  if (['greenhouse', 'lever', 'workday', 'csod', 'smartrecruiters', 'talentsoft', 'successfactors'].includes(ats)) return 'high';
  if (apiCount > 0) return 'medium';
  return 'unknown';
}

export async function onboardAndPersist(
  db: PrismaClient,
  websiteUrl: string,
  opts: { companyName?: string; sourceName?: string } = {},
): Promise<EmployerOnboardingReport> {
  const report = await onboardEmployer(websiteUrl, opts.companyName);
  const repo = new AtsIntelligenceRepository(db);
  await repo.saveProbe(report, {
    sourceName: opts.sourceName,
    companyName: opts.companyName ?? report.companyName ?? new URL(websiteUrl).hostname,
    inputUrl: websiteUrl,
  });
  return report;
}
