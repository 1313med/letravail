import type { Page } from 'playwright';
import type { ScrapeCategory } from '../config/index.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import type { Job } from '../types/job.js';
import { normalizeJobTextFields } from '../utils/cleaning.js';
import { filterJobCandidates } from '../utils/job-filters.js';
import { waitForAnySelector } from './helpers.js';

export interface GenericScraperConfig {
  sourceName: string;
  companyName: string;
  category: ScrapeCategory;
  urls: string[];
  tags: string[];
  defaultCity?: string;
}

export function createGenericScraper(config: GenericScraperConfig) {
  return {
    async scrapeWithPool(pagePool: PagePool): Promise<Job[]> {
      const page = await pagePool.acquire();
      try {
        for (const url of config.urls) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await waitForAnySelector(page, ['body'], 5_000);
            const jobs = await extractJobsFromPage(page, config);
            if (jobs.length > 0) return jobs;
          } catch {
            continue;
          }
        }
        return [];
      } finally {
        await pagePool.release(page);
      }
    },
  };
}

async function extractJobsFromPage(page: Page, config: GenericScraperConfig): Promise<Job[]> {
  const baseUrl = page.url();
  const raw = await page.evaluate(
    ({ companyName, defaultCity, base }) => {
      const results: Array<{
        sourceJobId: string;
        title: string;
        city: string;
        applicationUrl: string;
        description: string;
      }> = [];
      const seen = new Set<string>();

      const candidates = Array.from(
        document.querySelectorAll(
          'a[href*="offre-emploi"], a[href*="/requisition/"], a[href*="/jobs/"], a[href*="/job/"], a[href*="vacanc"], a.highlitedOffres-a',
        ),
      );

      for (const anchor of candidates) {
        const el = anchor as HTMLAnchorElement;
        const title = el.textContent?.trim() ?? '';
        const href = el.href;
        if (!title || title.length < 5 || title.length > 200) continue;
        if (seen.has(href)) continue;
        seen.add(href);

        const container = el.closest('article, li, tr, div, section');
        const city =
          container
            ?.querySelector('[class*="ville"], [class*="location"], [class*="city"], .lieu')
            ?.textContent?.trim() ?? defaultCity;

        results.push({
          sourceJobId: href.replace(base, '').slice(0, 120) || href,
          title,
          city: city ?? defaultCity ?? 'Casablanca',
          applicationUrl: href,
          description: title,
        });
      }

      void companyName;
      return results;
    },
    { companyName: config.companyName, defaultCity: config.defaultCity ?? 'Casablanca', base: baseUrl },
  );

  return filterJobCandidates(raw).map((item) =>
    normalizeJobTextFields({
      source: config.sourceName,
      sourceJobId: item.sourceJobId,
      title: item.title,
      company: config.companyName,
      city: item.city,
      country: 'Morocco',
      description: item.description,
      applicationUrl: item.applicationUrl,
      tags: config.tags,
    }),
  );
}
