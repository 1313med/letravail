/**
 * Workday ATS adapter — public CXS jobs API.
 * Pattern: https://{host}/wday/cxs/{tenant}/{site}/jobs
 */
import type { Job } from '../types/job.js';
import { cleanText, stripHtml } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface WorkdayConfig {
  sourceName: string;
  companyName: string;
  host: string;
  tenant: string;
  site: string;
  tags: string[];
  defaultCity?: string;
  countryFilter?: RegExp;
}

interface WorkdayListResponse {
  total: number;
  jobPostings: Array<{
    title: string;
    externalPath: string;
    locationsText?: string;
    postedOn?: string;
    bulletFields?: string[];
  }>;
}

export async function fetchWorkdayJobs(config: WorkdayConfig): Promise<Job[]> {
  const base = `https://${config.host}/wday/cxs/${config.tenant}/${config.site}`;
  const seen = new Set<string>();
  const jobs: Job[] = [];

  const searchTerms = config.countryFilter
    ? ['Morocco', 'Maroc', 'Casablanca', 'Rabat', '']
    : [''];

  try {
    for (const searchText of searchTerms) {
      const batch = await fetchWorkdayPageBatch(config, base, searchText, seen);
      jobs.push(...batch);
      if (jobs.length >= 500) break;
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'Workday jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'Workday fetch error');
    return [];
  }
}

async function fetchWorkdayPageBatch(
  config: WorkdayConfig,
  base: string,
  searchText: string,
  seen: Set<string>,
): Promise<Job[]> {
  const jobs: Job[] = [];
  let offset = 0;
  const limit = 50;
  let total = Infinity;

  while (offset < total) {
    const res = await fetch(`${base}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'LetravailScraper/1.0',
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit,
        offset,
        searchText,
      }),
    });

    if (!res.ok) {
      logger.warn({ source: config.sourceName, status: res.status, offset, searchText }, 'Workday API failed');
      break;
    }

    const data = (await res.json()) as WorkdayListResponse;
    total = data.total ?? 0;

    for (const posting of data.jobPostings ?? []) {
      const key = posting.externalPath;
      if (seen.has(key)) continue;

      const location = posting.locationsText ?? '';
      if (!matchesCountryFilter(config, location, posting)) continue;

      const detail = await fetchWorkdayJobDetail(base, posting.externalPath);
      const description = detail || posting.bulletFields?.join('\n') || posting.title;
      if (config.countryFilter && !matchesCountryFilter(config, location, posting, description)) continue;

      seen.add(key);
      const publishedAt = parseWorkdayDate(posting.postedOn);

      jobs.push({
        source: config.sourceName,
        sourceJobId: posting.externalPath.replace(/^\//, ''),
        title: posting.title,
        company: config.companyName,
        city: extractCity(location) || config.defaultCity || 'Casablanca',
        country: 'Morocco',
        description: cleanText(description),
        applicationUrl: `https://${config.host}${posting.externalPath}`,
        rawHtml: detail,
        publishedAt,
        tags: config.tags,
      });
    }

    offset += limit;
    if ((data.jobPostings ?? []).length === 0) break;
  }

  return jobs;
}

async function fetchWorkdayJobDetail(base: string, path: string): Promise<string> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { jobPostingInfo?: { jobDescription?: string } };
    return stripHtml(data.jobPostingInfo?.jobDescription ?? '');
  } catch {
    return '';
  }
}

function extractCity(location: string): string | undefined {
  const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Fez', 'Agadir'];
  for (const c of cities) {
    if (location.toLowerCase().includes(c.toLowerCase())) return c;
  }
  if (/morocco|maroc/i.test(location)) return 'Casablanca';
  return undefined;
}

function matchesCountryFilter(
  config: WorkdayConfig,
  location: string,
  posting: { externalPath: string; title: string },
  extra = '',
): boolean {
  if (!config.countryFilter) return true;
  const haystack = `${location} ${posting.externalPath} ${posting.title} ${extra}`;
  return config.countryFilter.test(haystack);
}

function parseWorkdayDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
