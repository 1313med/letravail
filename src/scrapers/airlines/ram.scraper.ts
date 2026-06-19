import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class RamScraper extends BaseScraper {
  readonly sourceName = 'royal-air-maroc';
  readonly category = 'airlines' as const;
  readonly companyName = 'Royal Air Maroc';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'royal-air-maroc',
      companyName: 'Royal Air Maroc',
      category: 'airlines',
      urls: ['https://www.royalairmaroc.com/fr-fr/carrieres', 'https://www.royalairmaroc.com/fr/carrieres'],
      tags: ['airlines', 'ram', 'aviation'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
