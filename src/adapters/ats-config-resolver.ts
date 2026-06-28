/**
 * Resolve crawl configuration from persisted ATS intelligence.
 */
import type { PrismaClient } from '@prisma/client';
import type { AtsCareerConfig } from './ats-career-scraper.js';
import type { ScrapeCategory } from '../config/index.js';

export async function resolveAtsConfigFromIntelligence(
  db: PrismaClient,
  sourceName: string,
  fallback: Omit<AtsCareerConfig, 'sourceName' | 'companyName'> & { companyName: string; tags: string[] },
): Promise<AtsCareerConfig | null> {
  const intel = await db.employerAtsIntelligence.findFirst({
    where: { sourceName },
    orderBy: { probedAt: 'desc' },
  });

  if (!intel || intel.confidence < 50) return null;

  const cfg = (intel.platformConfig ?? {}) as Record<string, unknown>;
  const careerUrls = [intel.careersPageUrl, intel.finalUrl, intel.inputUrl].filter(
    (u): u is string => Boolean(u),
  );

  return {
    sourceName,
    companyName: intel.companyName,
    careerUrls: [...new Set(careerUrls)],
    tags: fallback.tags,
    defaultCity: fallback.defaultCity,
    category: fallback.category,
    greenhouseBoard: cfg.greenhouseBoard as string | undefined,
    leverSlug: cfg.leverSlug as string | undefined,
    smartRecruitersId: cfg.smartRecruitersId as string | undefined,
    workday: cfg.workday as AtsCareerConfig['workday'],
  };
}

export function intelligenceToAtsCareerConfig(
  intel: {
    sourceName: string | null;
    companyName: string;
    careersPageUrl: string | null;
    finalUrl: string | null;
    inputUrl: string;
    platformConfig: unknown;
    crawlStrategy: string;
  },
  tags: string[],
  category?: ScrapeCategory,
): AtsCareerConfig | null {
  if (!intel.sourceName) return null;
  const cfg = (intel.platformConfig ?? {}) as Record<string, unknown>;
  const careerUrls = [intel.careersPageUrl, intel.finalUrl, intel.inputUrl].filter(
    (u): u is string => Boolean(u),
  );

  return {
    sourceName: intel.sourceName,
    companyName: intel.companyName,
    careerUrls: [...new Set(careerUrls)],
    tags,
    category,
    greenhouseBoard: cfg.greenhouseBoard as string | undefined,
    leverSlug: cfg.leverSlug as string | undefined,
    smartRecruitersId: cfg.smartRecruitersId as string | undefined,
    workday: cfg.workday as AtsCareerConfig['workday'],
  };
}
