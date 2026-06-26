/**
 * Unified ATS career fetcher — API first, generic DOM fallback.
 */
import type { Job } from '../types/job.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import { fetchGreenhouseJobs } from './greenhouse.adapter.js';
import { fetchLeverJobs } from './lever.adapter.js';
import { fetchWorkdayJobs } from './workday.adapter.js';
import { discoverWorkdaySite } from './workday-discover.js';
import { fetchSmartRecruitersJobs } from './smartrecruiters.adapter.js';
import { fetchTalentSoftJobs, isTalentSoftUrl } from './talentsoft.adapter.js';
import { MOROCCO_FILTER, probeCareerSite } from './career-site-prober.js';
import { createGenericScraper } from '../scrapers/generic.scraper.js';
import type { ScrapeCategory } from '../config/index.js';
import { logger } from '../lib/logger.js';

export interface AtsCareerConfig {
  sourceName: string;
  companyName: string;
  careerUrls: string[];
  tags: string[];
  defaultCity?: string;
  category?: ScrapeCategory;
  greenhouseBoard?: string;
  leverSlug?: string;
  smartRecruitersId?: string;
  workday?: { host: string; tenant: string; site: string };
}

export async function fetchAtsCareerJobs(
  config: AtsCareerConfig,
  pagePool?: PagePool,
): Promise<Job[]> {
  if (config.greenhouseBoard) {
    const jobs = await fetchGreenhouseJobs({
      sourceName: config.sourceName,
      companyName: config.companyName,
      boardToken: config.greenhouseBoard,
      category: 'employer',
      tags: config.tags,
      defaultCity: config.defaultCity,
      countryFilter: MOROCCO_FILTER,
    });
    if (jobs.length > 0) return jobs;
  }

  if (config.leverSlug) {
    const jobs = await fetchLeverJobs({
      sourceName: config.sourceName,
      companyName: config.companyName,
      siteSlug: config.leverSlug,
      tags: config.tags,
      defaultCity: config.defaultCity,
      countryFilter: MOROCCO_FILTER,
    });
    if (jobs.length > 0) return jobs;
  }

  if (config.smartRecruitersId) {
    const jobs = await fetchSmartRecruitersJobs({
      sourceName: config.sourceName,
      companyName: config.companyName,
      companyId: config.smartRecruitersId,
      tags: config.tags,
      defaultCity: config.defaultCity,
      countryCode: 'ma',
    });
    if (jobs.length > 0) return jobs;
  }

  if (config.workday) {
    let wd = config.workday;
    let jobs = await fetchWorkdayJobs({
      sourceName: config.sourceName,
      companyName: config.companyName,
      ...wd,
      tags: config.tags,
      defaultCity: config.defaultCity,
      countryFilter: MOROCCO_FILTER,
    });
    if (jobs.length > 0) return jobs;

    const discoveredSite = await discoverWorkdaySite(wd.host, wd.tenant);
    if (discoveredSite && discoveredSite !== wd.site) {
      wd = { ...wd, site: discoveredSite };
      jobs = await fetchWorkdayJobs({
        sourceName: config.sourceName,
        companyName: config.companyName,
        ...wd,
        tags: config.tags,
        defaultCity: config.defaultCity,
        countryFilter: MOROCCO_FILTER,
      });
      if (jobs.length > 0) return jobs;
    }
  }

  for (const url of config.careerUrls) {
    if (isTalentSoftUrl(url) && pagePool) {
      const jobs = await fetchTalentSoftJobs(
        {
          sourceName: config.sourceName,
          companyName: config.companyName,
          listingUrl: url,
          tags: config.tags,
          defaultCity: config.defaultCity,
        },
        pagePool,
      );
      if (jobs.length > 0) return jobs;
    }

    const probe = await probeCareerSite(url);
    if (probe.greenhouseToken) {
      const jobs = await fetchGreenhouseJobs({
        sourceName: config.sourceName,
        companyName: config.companyName,
        boardToken: probe.greenhouseToken,
        category: 'employer',
        tags: config.tags,
        defaultCity: config.defaultCity,
        countryFilter: MOROCCO_FILTER,
      });
      if (jobs.length > 0) return jobs;
    }
    if (probe.leverSlug) {
      const jobs = await fetchLeverJobs({
        sourceName: config.sourceName,
        companyName: config.companyName,
        siteSlug: probe.leverSlug,
        tags: config.tags,
        defaultCity: config.defaultCity,
        countryFilter: MOROCCO_FILTER,
      });
      if (jobs.length > 0) return jobs;
    }
    if (probe.workdayConfig) {
      const jobs = await fetchWorkdayJobs({
        sourceName: config.sourceName,
        companyName: config.companyName,
        ...probe.workdayConfig,
        tags: config.tags,
        defaultCity: config.defaultCity,
        countryFilter: MOROCCO_FILTER,
      });
      if (jobs.length > 0) return jobs;
    }
  }

  if (pagePool) {
    const generic = createGenericScraper({
      sourceName: config.sourceName,
      companyName: config.companyName,
      category: config.category ?? 'technology',
      urls: config.careerUrls,
      tags: config.tags,
      defaultCity: config.defaultCity ?? 'Casablanca',
    });
    const jobs = await generic.scrapeWithPool(pagePool);
    if (jobs.length > 0) return jobs;
  }

  logger.warn({ source: config.sourceName }, 'No jobs found via ATS or generic fallback');
  return [];
}
