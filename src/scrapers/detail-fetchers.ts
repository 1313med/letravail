import type { Page } from 'playwright';
import { cleanText } from '../utils/cleaning.js';

export interface DetailContent {
  description?: string;
  requirements?: string;
  rawHtml?: string;
  contractType?: string;
  city?: string;
}

const DESCRIPTION_SELECTORS = [
  '.offre-detail',
  '.job-description',
  '.job-details',
  '[class*="description"]',
  '[class*="offre"]',
  'article',
  '.content',
  'main',
];

export async function fetchCihJobDetail(page: Page, url: string): Promise<DetailContent> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(800);

  return page.evaluate((selectors) => {
    let description = '';
    let rawHtml = '';

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && (el.textContent?.trim().length ?? 0) > description.length) {
        description = el.textContent?.trim() ?? '';
        rawHtml = el.innerHTML;
      }
    }

    if (!description) {
      const main = document.querySelector('main, #content, .container');
      description = main?.textContent?.trim() ?? document.body.textContent?.trim() ?? '';
      rawHtml = main?.innerHTML ?? '';
    }

    const pageText = document.body.textContent ?? '';
    const contractMatch = pageText.match(/\b(CDI|CDD|Stage|Intérim|Anapec)\b/i);
    const cityMatch = pageText.match(
      /Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Oujda|Laayoune|Mohammedia|K[eé]nitra|Dakhla|T[eé]touan|Nador|Beni Mellal|Kh[eé]nifra|Settat|El Jadida/i,
    );

    return {
      description,
      rawHtml,
      contractType: contractMatch?.[1],
      city: cityMatch?.[0],
    };
  }, DESCRIPTION_SELECTORS).then((detail) => ({
    description: cleanText(detail.description),
    rawHtml: detail.rawHtml,
    contractType: detail.contractType,
    city: detail.city,
  }));
}

export async function fetchGenericJobDetail(page: Page, url: string): Promise<DetailContent> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_000);

  const genericSelectors = [
    '.jobs-description__content',
    '.job-description',
    '.job-details',
    '[data-automation-id="jobPostingDescription"]',
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="description"]',
    'article',
    'main',
  ];

  return page.evaluate((selectors) => {
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

    const pageText = document.body.textContent ?? '';
    const contractMatch = pageText.match(/\b(CDI|CDD|Stage|Freelance|Alternance|Temps plein|Temps partiel)\b/i);

    return {
      description,
      rawHtml,
      contractType: contractMatch?.[1],
    };
  }, genericSelectors).then((detail) => ({
    description: cleanText(detail.description),
    rawHtml: detail.rawHtml,
    contractType: detail.contractType,
  }));
}

const CSOD_DETAIL_API = 'https://eu-cdg.api.csod.com/rec-job-search/external/jobs';

export async function fetchAttijariwafaJobDetail(
  page: Page,
  requisitionId: string,
): Promise<DetailContent> {
  try {
    const payload = await page.evaluate(
      async ({ apiUrl, reqId }) => {
        const response = await fetch(`${apiUrl}/${reqId}`, {
          method: 'GET',
          headers: { accept: 'application/json, text/plain, */*' },
          credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
      },
      { apiUrl: CSOD_DETAIL_API, reqId: requisitionId },
    );

    const data = payload as {
      data?: {
        externalDescription?: string;
        displayJobTitle?: string;
        locations?: Array<{ city?: string }>;
      };
    } | null;

    const html = data?.data?.externalDescription ?? '';
    if (html) {
      return {
        description: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        rawHtml: html,
        city: data?.data?.locations?.[0]?.city,
      };
    }
  } catch {
    /* fall through to page fetch */
  }

  const detailUrl = `https://attijariwafabank.csod.com/ux/ats/careersite/4/home/requisition/${requisitionId}?c=attijariwafabank&lang=fr-FR`;
  return fetchGenericJobDetail(page, detailUrl);
}

export async function enrichJobsWithDetails<T extends { applicationUrl: string; description: string; title: string }>(
  page: Page,
  jobs: T[],
  fetcher: (page: Page, url: string) => Promise<DetailContent>,
  options?: { limit?: number; delayMs?: number },
): Promise<Array<T & DetailContent>> {
  const limit = options?.limit ?? jobs.length;
  const delayMs = options?.delayMs ?? 500;
  const results: Array<T & DetailContent> = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    if (i < limit && job.applicationUrl) {
      try {
        const detail = await fetcher(page, job.applicationUrl);
        results.push({ ...job, ...detail });
        await page.waitForTimeout(delayMs);
      } catch {
        results.push(job);
      }
    } else {
      results.push(job);
    }
  }

  return results;
}
