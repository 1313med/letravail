/**
 * TalentSoft (Lumesse) career portal adapter.
 * Used by Banque Populaire and other Moroccan employers.
 */
import type { Page } from 'playwright';
import type { Job } from '../types/job.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import { logger } from '../lib/logger.js';

export interface TalentSoftConfig {
  sourceName: string;
  companyName: string;
  listingUrl: string;
  tags: string[];
  defaultCity?: string;
}

export async function fetchTalentSoftJobs(
  config: TalentSoftConfig,
  pagePool: PagePool,
): Promise<Job[]> {
  const page = await pagePool.acquire();
  try {
    await page.goto(config.listingUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(3_000);

    const listings = await page.evaluate(() => {
      const results: Array<{
        sourceJobId: string;
        title: string;
        applicationUrl: string;
        meta: string;
      }> = [];
      const seen = new Set<string>();

      for (const heading of Array.from(document.querySelectorAll('h3'))) {
        const title = heading.textContent?.trim() ?? '';
        if (title.length < 8) continue;
        const link = heading.querySelector('a') ?? heading.closest('a') ?? heading.parentElement?.querySelector('a');
        const href = (link as HTMLAnchorElement | null)?.href;
        if (!href || !/offre-de-emploi\/emploi-/i.test(href)) continue;
        if (seen.has(href)) continue;
        seen.add(href);

        const container = heading.closest('article, li, div, section, tr');
        const meta = container?.textContent?.replace(title, '').trim().slice(0, 200) ?? '';

        results.push({
          sourceJobId: href.match(/_(\d+)\.aspx/i)?.[1] ?? href.slice(-40),
          title,
          applicationUrl: href,
          meta,
        });
      }

      if (results.length === 0) {
        for (const anchor of Array.from(document.querySelectorAll('a[href*="offre-de-emploi/emploi-"]'))) {
          const el = anchor as HTMLAnchorElement;
          const title = el.textContent?.trim() ?? '';
          const href = el.href;
          if (title.length < 8 || seen.has(href)) continue;
          seen.add(href);
          results.push({
            sourceJobId: href.match(/_(\d+)\.aspx/i)?.[1] ?? href.slice(-40),
            title,
            applicationUrl: href,
            meta: '',
          });
        }
      }

      return results;
    });

    if (listings.length === 0) return [];

    const jobs: Job[] = [];
    for (const listing of listings.slice(0, 50)) {
      let description = listing.title;
      let contractType: string | undefined;
      let city = config.defaultCity ?? 'Casablanca';

      try {
        const detail = await fetchTalentSoftDetail(page, listing.applicationUrl);
        description = detail.description || description;
        contractType = detail.contractType;
        city = detail.city || city;
      } catch {
        /* keep listing */
      }

      jobs.push({
        source: config.sourceName,
        sourceJobId: listing.sourceJobId,
        title: listing.title,
        company: config.companyName,
        city,
        country: 'Morocco',
        description,
        applicationUrl: listing.applicationUrl,
        contractType,
        tags: config.tags,
        publishedAt: parseTalentSoftDate(listing.meta),
      });
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'TalentSoft jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'TalentSoft fetch error');
    return [];
  } finally {
    await pagePool.release(page);
  }
}

async function fetchTalentSoftDetail(
  page: Page,
  url: string,
): Promise<{ description: string; city?: string; contractType?: string }> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(1_500);

  return page.evaluate(() => {
    const descriptionEl =
      document.querySelector('#ctl00_ctl00_corpsRoot_corps_DescriptionOffer') ??
      document.querySelector('[id*="DescriptionOffer"]') ??
      document.querySelector('.description-offre, .offer-description, [class*="description"]');

    const metaText = document.body?.innerText ?? '';
    const cityMatch = metaText.match(/Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Oujda|La[aâ]youne|Nador|Kenitra|K[eé]nitra/i);
    const contractMatch = metaText.match(/\b(CDI|CDD|Anapec|Stage)\b/i);

    const description = cleanTextLocal(descriptionEl?.textContent ?? metaText.slice(0, 4000));

    return {
      description,
      city: cityMatch?.[0],
      contractType: contractMatch?.[1],
    };

    function cleanTextLocal(text: string): string {
      return text.replace(/\s+/g, ' ').trim();
    }
  });
}

function parseTalentSoftDate(meta: string): Date | undefined {
  const match = meta.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}`);
}

export function isTalentSoftUrl(url: string): boolean {
  return /talent-soft\.com/i.test(url);
}
