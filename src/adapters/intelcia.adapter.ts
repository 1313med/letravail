/**
 * Intelcia careers portal adapter (SuccessFactors-backed).
 * Public API: https://careers.intelcia.com/api/offers?locale=fr_FR&country=MAR
 */
import type { Job } from '../types/job.js';
import { cleanText } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface IntelciaConfig {
  sourceName: string;
  companyName: string;
  tags: string[];
  defaultCity?: string;
  countryCode?: string;
}

interface IntelciaOffer {
  id: string;
  title: string;
  country?: string;
  city?: string;
  description?: string | null;
  advantages?: string | null;
  redirectUrl?: string;
  postStartDate?: string;
  exp?: string;
  group?: string;
}

export async function fetchIntelciaJobs(config: IntelciaConfig): Promise<Job[]> {
  const country = config.countryCode ?? 'MAR';
  const url = `https://careers.intelcia.com/api/offers?locale=fr_FR&country=${country}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
    });
    if (!res.ok) {
      logger.warn({ source: config.sourceName, status: res.status }, 'Intelcia API failed');
      return [];
    }

    const offers = (await res.json()) as IntelciaOffer[];
    if (!Array.isArray(offers) || offers.length === 0) return [];

    const jobs: Job[] = offers.map((offer) => {
      const city = parseIntelciaCity(offer.city) || config.defaultCity || 'Casablanca';
      const descriptionParts = [offer.description, offer.advantages].filter(Boolean);
      const description = descriptionParts.length > 0
        ? cleanText(descriptionParts.join('\n\n'))
        : offer.title;

      return {
        source: config.sourceName,
        sourceJobId: offer.id,
        title: offer.title,
        company: config.companyName,
        city,
        country: 'Morocco',
        description,
        applicationUrl: offer.redirectUrl
          ?? `https://careers.intelcia.com/fr-ma/offres-emploi/${offer.id}`,
        publishedAt: parseSfDate(offer.postStartDate),
        tags: [...config.tags, mapIntelciaGroup(offer.group)],
        experienceLevel: mapIntelciaExp(offer.exp),
      };
    });

    logger.info({ source: config.sourceName, count: jobs.length }, 'Intelcia jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'Intelcia fetch error');
    return [];
  }
}

function parseIntelciaCity(raw?: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/city_([A-Za-zÀ-ÿ\s-]+)/i);
  return match?.[1]?.replace(/~.*$/, '').trim();
}

function parseSfDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (!match) return undefined;
  const ms = Number(match[1]);
  return Number.isFinite(ms) ? new Date(ms) : undefined;
}

function mapIntelciaExp(exp?: string): string | undefined {
  if (!exp) return undefined;
  const m = exp.match(/(\d+)/);
  if (!m) return undefined;
  const years = Number(m[1]);
  if (years <= 1) return 'junior';
  if (years <= 3) return 'mid';
  return 'senior';
}

function mapIntelciaGroup(group?: string): string {
  if (!group) return 'intelcia';
  if (group.includes('Metier_1')) return 'customer-service';
  if (group.includes('Metier_2')) return 'it-solutions';
  return 'intelcia';
}
