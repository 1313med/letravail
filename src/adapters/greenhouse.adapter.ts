/**
 * Greenhouse ATS adapter — fetches jobs via public boards API.
 * https://developers.greenhouse.io/job-board.html
 */
import type { Job } from '../types/job.js';
import { cleanText, stripHtml } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface GreenhouseConfig {
  sourceName: string;
  companyName: string;
  boardToken: string;
  category: string;
  tags: string[];
  defaultCity?: string;
  countryFilter?: RegExp;
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  content?: string;
  updated_at: string;
}

export async function fetchGreenhouseJobs(config: GreenhouseConfig): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${config.boardToken}/jobs?content=true`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
    });
    if (!res.ok) {
      logger.warn({ source: config.sourceName, status: res.status }, 'Greenhouse API failed');
      return [];
    }

    const data = (await res.json()) as { jobs: GreenhouseJob[] };
    const jobs: Job[] = [];

    for (const gj of data.jobs ?? []) {
      const location = gj.location?.name ?? '';
      if (config.countryFilter && !config.countryFilter.test(location)) continue;

      const description = gj.content ? cleanText(stripHtml(gj.content)) : gj.title;
      jobs.push({
        source: config.sourceName,
        sourceJobId: String(gj.id),
        title: gj.title,
        company: config.companyName,
        city: extractCity(location) || config.defaultCity || 'Casablanca',
        country: 'Morocco',
        description,
        applicationUrl: gj.absolute_url,
        rawHtml: gj.content,
        publishedAt: gj.updated_at ? new Date(gj.updated_at) : undefined,
        tags: [...config.tags, config.category],
      });
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'Greenhouse jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'Greenhouse fetch error');
    return [];
  }
}

function extractCity(location: string): string | undefined {
  const moroccanCities = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Fez', 'Tanger', 'Agadir',
    'Meknès', 'Meknes', 'Oujda', 'Kenitra', 'Tétouan', 'Tetouan', 'Mohammedia',
    'Salé', 'Sale', 'Temara', 'Benguerir', 'Berrechid',
  ];
  for (const city of moroccanCities) {
    if (location.toLowerCase().includes(city.toLowerCase())) return city;
  }
  if (/morocco|maroc/i.test(location)) return 'Casablanca';
  return undefined;
}
