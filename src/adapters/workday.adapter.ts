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
  const jobs: Job[] = [];

  try {
    let offset = 0;
    const limit = 20;
    let total = Infinity;

    while (offset < total && jobs.length < 500) {
      const res = await fetch(`${base}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'LetravailScraper/1.0',
        },
        body: JSON.stringify({ appliedFacets: {}, limit, offset, searchText: '' }),
      });

      if (!res.ok) {
        logger.warn({ source: config.sourceName, status: res.status, offset }, 'Workday API failed');
        break;
      }

      const data = (await res.json()) as WorkdayListResponse;
      total = data.total ?? 0;

      for (const posting of data.jobPostings ?? []) {
        const location = posting.locationsText ?? '';
        if (config.countryFilter && location && !config.countryFilter.test(location)) continue;

        const detail = await fetchWorkdayJobDetail(base, posting.externalPath);
        const description = detail || posting.bulletFields?.join('\n') || posting.title;

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
          publishedAt: posting.postedOn ? new Date(posting.postedOn) : undefined,
          tags: config.tags,
        });
      }

      offset += limit;
      if ((data.jobPostings ?? []).length === 0) break;
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'Workday jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'Workday fetch error');
    return [];
  }
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
