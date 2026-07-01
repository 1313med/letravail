/**
 * LinkedIn job detail — Node fetch (primary) + Playwright fallback.
 * Guest API works reliably server-side; browser fetch is unreliable.
 */
import type { Page } from 'playwright';
import { logger } from '../../lib/logger.js';
import { cleanText, stripHtml } from '../../utils/cleaning.js';
import { parseJobSections } from '../../enrichment/section-parser.js';
import { parseLinkedInCompanyUrl } from './employer-hint.js';

export interface LinkedInDetailResult {
  title: string;
  company: string;
  city: string;
  companyLinkedInUrl?: string;
  companyLinkedInSlug?: string;
  description: string;
  requirements?: string;
  benefits?: string;
  rawHtml: string;
  method: 'guest-api' | 'playwright' | 'failed';
  descriptionLength: number;
}

const GUEST_API = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';
const MIN_RICH_DESCRIPTION = 200;

const DESCRIPTION_SELECTORS = [
  '.jobs-description__content',
  '.jobs-description-content__text',
  '.jobs-box__html-content',
  '#job-details',
  '[class*="jobs-description"]',
  '[class*="description__text"]',
];

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

export async function fetchLinkedInJobDetail(
  page: Page,
  jobId: string,
): Promise<LinkedInDetailResult> {
  const guest = await fetchViaGuestApiDirect(jobId);
  if (guest.description.length >= MIN_RICH_DESCRIPTION) return guest;

  const playwright = await fetchViaPlaywright(page, jobId);
  if (playwright.description.length > guest.description.length) return playwright;

  return guest.description.length > 0 ? guest : playwright;
}

/** Primary: server-side guest API (no auth, no CORS) */
export async function fetchViaGuestApiDirect(jobId: string): Promise<LinkedInDetailResult> {
  const empty = emptyResult('guest-api');

  try {
    const res = await fetch(`${GUEST_API}/${jobId}`, { headers: FETCH_HEADERS });
    if (!res.ok) {
      logger.debug({ jobId, status: res.status }, 'LinkedIn guest API non-200');
      return empty;
    }

    const html = await res.text();
    if (html.length < 50) return empty;

    return parseGuestApiHtml(html, 'guest-api');
  } catch (err) {
    logger.debug({ err, jobId }, 'LinkedIn guest API failed');
    return empty;
  }
}

function parseGuestApiHtml(html: string, method: 'guest-api' | 'playwright'): LinkedInDetailResult {
  const titleMatch =
    html.match(/<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)
    ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const companyLinkMatch =
    html.match(/<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*href="([^"]+)"/i)
    ?? html.match(/<a[^>]*href="(https?:\/\/[^"]*\/company\/[^"]+)"[^>]*class="[^"]*topcard__org-name-link/i);
  const companyLinkedInUrl = companyLinkMatch?.[1]?.split('?')[0];
  const companySlug = companyLinkedInUrl ? parseLinkedInCompanyUrl(companyLinkedInUrl)?.slug : undefined;

  const companyMatch =
    html.match(/<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    ?? html.match(/class="[^"]*top-card-layout__card[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  const cityMatch = html.match(/<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

  const descMatch =
    html.match(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    ?? html.match(/<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const rawHtml = descMatch?.[1] ?? '';
  const description = rawHtml ? cleanText(stripHtml(rawHtml)) : cleanText(stripTags(html));
  const sections = parseJobSections(description);

  return {
    title: cleanText(stripTags(titleMatch?.[1] ?? '')),
    company: cleanText(stripTags(companyMatch?.[1] ?? '')),
    city: cleanText(stripTags(cityMatch?.[1] ?? '')),
    companyLinkedInUrl,
    companyLinkedInSlug: companySlug,
    description: sections.body || description,
    requirements: sections.requirements,
    benefits: sections.benefits,
    rawHtml: rawHtml || html.slice(0, 80_000),
    method,
    descriptionLength: (sections.body || description).length,
  };
}

async function fetchViaPlaywright(page: Page, jobId: string): Promise<LinkedInDetailResult> {
  const empty = emptyResult('playwright');
  const url = `https://www.linkedin.com/jobs/view/${jobId}/`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 35_000 }).catch(async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
    });
    await page.waitForTimeout(2_000);

    if (page.url().includes('/login') || page.url().includes('/authwall')) {
      return { ...empty, method: 'failed' };
    }

    for (const selector of DESCRIPTION_SELECTORS) {
      try {
        await page.waitForSelector(selector, { timeout: 5_000 });
        break;
      } catch {
        continue;
      }
    }

    await page.evaluate(() => {
      document.querySelectorAll('button').forEach((btn) => {
        const label = btn.getAttribute('aria-label') ?? btn.textContent ?? '';
        if (/voir plus|see more|show more/i.test(label)) (btn as HTMLElement).click();
      });
    });
    await page.waitForTimeout(800);

    const data = await page.evaluate((selectors) => {
      let description = '';
      let rawHtml = '';
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const len = el?.textContent?.trim().length ?? 0;
        if (len > description.length) {
          description = el?.textContent?.trim() ?? '';
          rawHtml = el?.innerHTML ?? '';
        }
      }
      const title = document.querySelector('h1, .job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ?? '';
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .topcard__org-name-link') as HTMLAnchorElement | null;
      const company = companyEl?.textContent?.trim() ?? '';
      const companyLinkedInUrl = companyEl?.href?.split('?')[0];
      const city = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.textContent?.trim() ?? '';
      return { title, company, city, companyLinkedInUrl, description, rawHtml };
    }, DESCRIPTION_SELECTORS);

    const sections = parseJobSections(cleanText(data.description));
    const companySlug = data.companyLinkedInUrl
      ? data.companyLinkedInUrl.match(/\/company\/([^/]+)/i)?.[1]?.toLowerCase()
      : undefined;
    return {
      title: cleanText(data.title),
      company: cleanText(data.company),
      city: cleanText(data.city),
      companyLinkedInUrl: data.companyLinkedInUrl,
      companyLinkedInSlug: companySlug,
      description: sections.body || cleanText(data.description),
      requirements: sections.requirements,
      benefits: sections.benefits,
      rawHtml: data.rawHtml,
      method: 'playwright',
      descriptionLength: (sections.body || data.description).length,
    };
  } catch (err) {
    logger.debug({ err, jobId }, 'LinkedIn Playwright detail failed');
    return { ...empty, method: 'failed' };
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function emptyResult(method: 'guest-api' | 'playwright'): LinkedInDetailResult {
  return {
    title: '',
    company: '',
    city: '',
    description: '',
    rawHtml: '',
    method,
    descriptionLength: 0,
  };
}

export interface LinkedInQualityMetrics {
  total: number;
  guestApiSuccess: number;
  playwrightSuccess: number;
  failed: number;
  skipped: number;
  avgDescriptionLength: number;
  titleOnly: number;
  withRequirements: number;
  withBenefits: number;
  detailSuccessRate: number;
}

export function summarizeLinkedInQuality(
  results: Array<{
    description: string;
    method: string;
    requirements?: string;
    benefits?: string;
  }>,
  skipped = 0,
): LinkedInQualityMetrics {
  const rich = (r: { description: string }) => r.description.length >= MIN_RICH_DESCRIPTION;
  const guestApiSuccess = results.filter((r) => r.method === 'guest-api' && rich(r)).length;
  const playwrightSuccess = results.filter((r) => r.method === 'playwright' && rich(r)).length;
  const failed = results.filter((r) => !rich(r)).length;
  const avgDescriptionLength = results.length
    ? Math.round(results.reduce((a, r) => a + r.description.length, 0) / results.length)
    : 0;

  return {
    total: results.length,
    guestApiSuccess,
    playwrightSuccess,
    failed,
    skipped,
    avgDescriptionLength,
    titleOnly: results.filter((r) => r.description.length < 50).length,
    withRequirements: results.filter((r) => r.requirements && r.requirements.length > 20).length,
    withBenefits: results.filter((r) => r.benefits && r.benefits.length > 20).length,
    detailSuccessRate: results.length > 0 ? (results.length - failed) / results.length : 0,
  };
}
