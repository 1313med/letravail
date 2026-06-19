import type { Job } from '../../types/job.js';
import { BaseScraper } from '../base.scraper.js';

const CAREERS_URL =
  'https://group.bnpparibas/emploi-carriere/toutes-offres-emploi/maroc';

export class BmciScraper extends BaseScraper {
  readonly sourceName = 'bmci';
  readonly category = 'banks' as const;
  readonly companyName = 'BMCI';

  async scrape(): Promise<Job[]> {
    return this.withPage(async (page) => {
      await page.goto(CAREERS_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(6_000);

      const listings = await page.evaluate(() => {
        const results: Array<{
          sourceJobId: string;
          title: string;
          city: string;
          applicationUrl: string;
          contractType?: string;
        }> = [];
        const seen = new Set<string>();

        const anchors = Array.from(document.querySelectorAll('a[href*="emploi"], a[href*="job"], a[href*="/offre"]'));
        for (const anchor of anchors) {
          const el = anchor as HTMLAnchorElement;
          const title = el.textContent?.trim() ?? '';
          const href = el.href;
          if (title.length < 8 || title.length > 180) continue;
          if (!/\b(CDI|CDD|Charg|Responsable|Analyste|Manager|Architecte|Expert|Contrôleur|Chef)\b/i.test(title)) {
            continue;
          }
          if (seen.has(href)) continue;
          seen.add(href);

          const context = el.closest('article, li, div, section')?.textContent ?? '';
          const cityMatch = context.match(/Casablanca|Rabat|Marrakech|Tanger|Maroc/i);
          const contractMatch = context.match(/\b(CDI|CDD)\b/);

          results.push({
            sourceJobId: href.split('/').pop() ?? href,
            title,
            city: cityMatch?.[0] ?? 'Casablanca',
            applicationUrl: href,
            contractType: contractMatch?.[1],
          });
        }

        const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
        for (const heading of headings) {
          const title = heading.textContent?.trim() ?? '';
          if (title.length < 8 || !/\b(CDI|CDD|Charg|Responsable|Analyste|Manager)\b/i.test(title)) continue;
          const link = heading.querySelector('a') ?? heading.closest('a');
          const href = (link as HTMLAnchorElement | null)?.href ?? location.href;
          const key = `${title}-${href}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            sourceJobId: key.slice(0, 120),
            title,
            city: 'Casablanca',
            applicationUrl: href,
          });
        }

        return results;
      });

      return listings.map((listing) =>
        this.normalize({
          ...listing,
          description: listing.title,
          tags: ['banks', 'finance', 'bmci'],
        }),
      );
    });
  }
}
