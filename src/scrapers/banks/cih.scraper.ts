import type { Page } from 'playwright';
import type { Job } from '../../types/job.js';
import { BaseScraper } from '../base.scraper.js';
import { parseFrenchDate } from '../helpers.js';

const LISTING_URL = 'https://recrutement.cihbank.ma/front-offres.html?direct';

export class CihScraper extends BaseScraper {
  readonly sourceName = 'cih-bank';
  readonly category = 'banks' as const;
  readonly companyName = 'CIH Bank';

  async scrape(): Promise<Job[]> {
    return this.withPage(async (page) => {
      const listings = await this.scrapeAllPages(page);
      return listings.map((listing) =>
        this.normalize({
          sourceJobId: listing.sourceJobId,
          title: listing.title,
          city: listing.city ?? 'Casablanca',
          description: listing.description ?? listing.title,
          applicationUrl: listing.applicationUrl,
          contractType: listing.contractType,
          publishedAt: listing.publishedAt,
          tags: ['banks', 'finance', 'cih'],
        }),
      );
    });
  }

  private async scrapeAllPages(page: Page): Promise<Array<{
    sourceJobId: string;
    title: string;
    city?: string;
    applicationUrl: string;
    description?: string;
    contractType?: string;
    publishedAt?: Date;
  }>> {
    const collected = new Map<string, {
      sourceJobId: string;
      title: string;
      city?: string;
      applicationUrl: string;
      description?: string;
      contractType?: string;
      publishedAt?: Date;
    }>();

    await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded' });
    let pageIndex = 0;
    let hasMore = true;

    while (hasMore && pageIndex < 30) {
      const url = pageIndex === 0
        ? LISTING_URL
        : `https://recrutement.cihbank.ma/front-offres.html?page=${pageIndex}`;
      if (pageIndex > 0) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
      }

      const batch = await this.extractPageJobs(page);
      const sizeBefore = collected.size;
      for (const job of batch) collected.set(job.sourceJobId, job);

      hasMore = batch.length > 0 && collected.size > sizeBefore;
      pageIndex++;
      if (batch.length === 0) break;
    }

    return [...collected.values()];
  }

  private async extractPageJobs(page: Page) {
    return page.evaluate(() => {
      const results: Array<{
        sourceJobId: string;
        title: string;
        city?: string;
        applicationUrl: string;
        description?: string;
        contractType?: string;
        publishedAt?: string;
      }> = [];

      const links = Array.from(document.querySelectorAll('a[href*="_offre-emploi-"]'));
      for (const link of links) {
        const anchor = link as HTMLAnchorElement;
        const title = anchor.textContent?.trim() ?? '';
        const href = anchor.href;
        const idMatch = href.match(/\/(\d+)_offre-emploi-/i);
        if (!title || !idMatch) continue;

        const row = anchor.closest('tr, .offre, article, li, div');
        const rowText = row?.textContent ?? '';
        const cityMatch = rowText.match(
          /Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Oujda|Laayoune|Mohammedia|K[eé]nitra|Dakhla|T[eé]touan|Nador|Beni Mellal|Kh[eé]nifra|Settat|El Jadida/i,
        );
        const dateMatch = rowText.match(/(\d{2}-\d{2}-\d{4})/);
        const contractMatch = rowText.match(/\b(CDI|CDD|Anapec|Stage|Intérim)\b/i);

        results.push({
          sourceJobId: idMatch[1]!,
          title,
          city: cityMatch?.[0],
          applicationUrl: href,
          description: title,
          contractType: contractMatch?.[1],
          publishedAt: dateMatch?.[1],
        });
      }

      return results;
    }).then((rows) =>
      rows.map((row) => ({
        ...row,
        publishedAt: row.publishedAt
          ? parseFrenchDate(row.publishedAt.replace(/-/g, '/'))
          : undefined,
      })),
    );
  }
}
