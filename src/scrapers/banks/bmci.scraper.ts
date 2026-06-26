import type { Job } from '../../types/job.js';
import { BaseScraper } from '../base.scraper.js';
import { fetchGenericJobDetail } from '../detail-fetchers.js';
import { mergeDetailContent } from '../../enrichment/job-enrichment.service.js';

const CAREERS_URLS = [
  'https://www.bmci.ma/fr/carrieres',
  'https://www.bmci.ma/carrieres',
  'https://group.bnpparibas/emploi-carriere/toutes-offres-emploi/maroc',
];

export class BmciScraper extends BaseScraper {
  readonly sourceName = 'bmci';
  readonly category = 'banks' as const;
  readonly companyName = 'BMCI';

  async scrape(): Promise<Job[]> {
    return this.withPage(async (page) => {
      for (const url of CAREERS_URLS) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
          await page.waitForTimeout(4_000);

          const listings = await page.evaluate(() => {
            const results: Array<{
              sourceJobId: string;
              title: string;
              city: string;
              applicationUrl: string;
              contractType?: string;
            }> = [];
            const seen = new Set<string>();

            const anchors = Array.from(document.querySelectorAll('a[href]'));
            for (const anchor of anchors) {
              const el = anchor as HTMLAnchorElement;
              const title = el.textContent?.trim() ?? '';
              const href = el.href;
              if (title.length < 8 || title.length > 200) continue;
              if (!/offre|emploi|job|poste|charg|responsable|analyste|manager|cdi|cdd/i.test(title + href)) continue;
              if (seen.has(href)) continue;
              seen.add(href);

              const context = el.closest('article, li, div, tr')?.textContent ?? '';
              const cityMatch = context.match(/Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Maroc/i);
              const contractMatch = context.match(/\b(CDI|CDD)\b/i);

              results.push({
                sourceJobId: href.split('/').filter(Boolean).pop() ?? href.slice(-40),
                title,
                city: cityMatch?.[0] ?? 'Casablanca',
                applicationUrl: href,
                contractType: contractMatch?.[1],
              });
            }
            return results;
          });

          if (listings.length === 0) continue;

          const jobs: Job[] = [];
          for (const listing of listings.slice(0, 40)) {
            let job = this.normalize({
              ...listing,
              description: listing.title,
              tags: ['banks', 'finance', 'bmci'],
            });
            try {
              const detail = await fetchGenericJobDetail(page, listing.applicationUrl);
              job = mergeDetailContent(job, detail);
            } catch { /* keep listing */ }
            jobs.push(job);
          }
          return jobs;
        } catch {
          continue;
        }
      }
      return [];
    });
  }
}
