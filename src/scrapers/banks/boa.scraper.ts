import type { Job } from '../../types/job.js';
import { BaseScraper } from '../base.scraper.js';

const CAREERS_URL = 'https://www.bankofafrica.group/fr/nous-rejoindre';

export class BoaScraper extends BaseScraper {
  readonly sourceName = 'bank-of-africa';
  readonly category = 'banks' as const;
  readonly companyName = 'Bank of Africa';

  async scrape(): Promise<Job[]> {
    return this.withPage(async (page) => {
      await page.goto(CAREERS_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
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

        const blocks = Array.from(document.querySelectorAll(
          '[class*="job"], [class*="offer"], [class*="offre"], article, .card, li',
        ));

        for (const block of blocks) {
          const text = block.textContent?.trim() ?? '';
          if (!/\b(CDI|CDD|CHARGE|CHARGÉ|ANALYSTE|AUDITEUR|MANAGER|RESPONSABLE)\b/i.test(text)) {
            continue;
          }

          const link = block.querySelector('a[href]') as HTMLAnchorElement | null;
          const title =
            block.querySelector('h2, h3, h4, strong, .title')?.textContent?.trim() ??
            link?.textContent?.trim() ??
            '';
          if (title.length < 8 || title.length > 180) continue;

          const href = link?.href ?? window.location.href;
          const key = `${title}-${href}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const cityMatch = text.match(
            /Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Oujda|K[eé]nitra|Maroc/i,
          );
          const contractMatch = text.match(/\b(CDI|CDD)\b/);

          results.push({
            sourceJobId: key.slice(0, 120),
            title,
            city: cityMatch?.[0] ?? 'Casablanca',
            applicationUrl: href,
            contractType: contractMatch?.[1],
          });
        }

        return results;
      });

      return listings.map((listing) =>
        this.normalize({
          ...listing,
          description: listing.title,
          tags: ['banks', 'finance', 'boa'],
        }),
      );
    });
  }
}
