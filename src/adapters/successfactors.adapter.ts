/**
 * SAP SuccessFactors / RMK public API adapter.
 * Pattern discovered on Intelcia: /api/offers?country=MAR
 */
import type { Job } from '../types/job.js';
import { cleanText } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface SuccessFactorsConfig {
  sourceName: string;
  companyName: string;
  careersOrigin: string;
  tags: string[];
  defaultCity?: string;
  countryCode?: string;
  apiUrl?: string;
}

interface SfOffer {
  id?: string | number;
  title?: string;
  country?: string;
  city?: string;
  description?: string | null;
  advantages?: string | null;
  redirectUrl?: string;
  postStartDate?: string;
  exp?: string;
  group?: string;
  location?: string;
  jobReqId?: string;
}

export async function fetchSuccessFactorsJobs(config: SuccessFactorsConfig): Promise<Job[]> {
  const country = config.countryCode ?? 'MAR';
  const origin = config.careersOrigin.replace(/\/$/, '');
  const candidates = [
    config.apiUrl,
    `${origin}/api/offers?locale=fr_FR&country=${country}`,
    `${origin}/api/offers?country=${country}`,
    `${origin}/api/offers?locale=fr_FR`,
    `${origin}/api/offers`,
  ].filter(Boolean) as string[];

  for (const url of [...new Set(candidates)]) {
    const jobs = await trySfEndpoint(url, config);
    if (jobs.length > 0) return jobs;
  }
  return [];
}

export function detectSuccessFactorsApiUrl(html: string, baseUrl: string): string | undefined {
  const origin = new URL(baseUrl).origin;
  const apiMatch = html.match(/["']([^"']*\/api\/offers[^"']*)["']/i);
  if (apiMatch?.[1]) {
    try {
      return new URL(apiMatch[1], origin).href;
    } catch {
      return undefined;
    }
  }
  if (/careers\.[a-z0-9-]+\.com/i.test(origin) || /successfactors/i.test(html)) {
    return `${origin}/api/offers?locale=fr_FR&country=MAR`;
  }
  return undefined;
}

async function trySfEndpoint(url: string, config: SuccessFactorsConfig): Promise<Job[]> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const offers = Array.isArray(data) ? data : extractOffersFromPayload(data);
    if (!offers.length) return [];

    const country = config.countryCode ?? 'MAR';
    const jobs: Job[] = [];

    for (const offer of offers) {
      if (!offer.title) continue;
      const offerCountry = String(offer.country ?? '');
      if (offerCountry && !/MAR|Morocco|Maroc/i.test(offerCountry) && country === 'MAR') continue;

      const city = parseSfCity(offer.city ?? offer.location) || config.defaultCity || 'Casablanca';
      const descriptionParts = [offer.description, offer.advantages].filter(Boolean);
      const description = descriptionParts.length > 0
        ? cleanText(descriptionParts.join('\n\n'))
        : offer.title;

      const id = String(offer.id ?? offer.jobReqId ?? offer.title);
      jobs.push({
        source: config.sourceName,
        sourceJobId: id,
        title: offer.title,
        company: config.companyName,
        city,
        country: 'Morocco',
        description,
        applicationUrl: offer.redirectUrl ?? `${config.careersOrigin}/offres-emploi/${id}`,
        publishedAt: parseSfDate(offer.postStartDate),
        tags: config.tags,
        experienceLevel: mapSfExp(offer.exp),
      });
    }

    if (jobs.length > 0) {
      logger.info({ source: config.sourceName, count: jobs.length, url }, 'SuccessFactors jobs fetched');
    }
    return jobs;
  } catch {
    return [];
  }
}

function extractOffersFromPayload(data: unknown): SfOffer[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.offers)) return obj.offers as SfOffer[];
  if (Array.isArray(obj.jobs)) return obj.jobs as SfOffer[];
  if (Array.isArray(obj.results)) return obj.results as SfOffer[];
  if (Array.isArray(obj.data)) return obj.data as SfOffer[];
  return [];
}

function parseSfCity(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cityMatch = raw.match(/city_([A-Za-zÀ-ÿ\s-]+)/i);
  if (cityMatch?.[1]) return cityMatch[1].replace(/~.*$/, '').trim();
  const moroccan = raw.match(/Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Kenitra/i);
  return moroccan?.[0];
}

function parseSfDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const epoch = raw.match(/\/Date\((\d+)\)\//);
  if (epoch) {
    const ms = Number(epoch[1]);
    return Number.isFinite(ms) ? new Date(ms) : undefined;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function mapSfExp(exp?: string): string | undefined {
  if (!exp) return undefined;
  const m = exp.match(/(\d+)/);
  if (!m) return undefined;
  const years = Number(m[1]);
  if (years <= 1) return 'junior';
  if (years <= 3) return 'mid';
  return 'senior';
}
