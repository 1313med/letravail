/**
 * Lever ATS adapter — public postings API.
 * https://github.com/lever/postings-api
 */
import type { Job } from '../types/job.js';
import { cleanText, stripHtml } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface LeverConfig {
  sourceName: string;
  companyName: string;
  siteSlug: string;
  tags: string[];
  defaultCity?: string;
  countryFilter?: RegExp;
}

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories: { location?: string; commitment?: string; team?: string };
  description: string;
  descriptionPlain?: string;
  lists?: Array<{ text: string; content: string }>;
}

export async function fetchLeverJobs(config: LeverConfig): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${config.siteSlug}?mode=json`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
    });
    if (!res.ok) {
      logger.warn({ source: config.sourceName, status: res.status }, 'Lever API failed');
      return [];
    }

    const postings = (await res.json()) as LeverPosting[];
    const jobs: Job[] = [];

    for (const p of postings) {
      const location = p.categories?.location ?? '';
      if (config.countryFilter && location && !config.countryFilter.test(location)) continue;

      const listsText = (p.lists ?? []).map((l) => `${l.text}\n${stripHtml(l.content)}`).join('\n\n');
      const description = cleanText(p.descriptionPlain ?? stripHtml(p.description) + '\n' + listsText);

      jobs.push({
        source: config.sourceName,
        sourceJobId: p.id,
        title: p.text,
        company: config.companyName,
        city: extractCity(location) || config.defaultCity || 'Casablanca',
        country: 'Morocco',
        description: description || p.text,
        applicationUrl: p.hostedUrl,
        rawHtml: p.description,
        contractType: p.categories?.commitment,
        publishedAt: p.createdAt ? new Date(p.createdAt) : undefined,
        tags: config.tags,
      });
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'Lever jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'Lever fetch error');
    return [];
  }
}

function extractCity(location: string): string | undefined {
  const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Fez', 'Agadir', 'Meknès', 'Oujda'];
  for (const c of cities) {
    if (location.toLowerCase().includes(c.toLowerCase())) return c;
  }
  if (/morocco|maroc|remote/i.test(location)) return 'Casablanca';
  return undefined;
}
