import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class RenaultScraper extends BaseScraper {
  readonly sourceName = 'renault-maroc';
  readonly category = 'automotive' as const;
  readonly companyName = 'Renault Maroc';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'renault-maroc',
      companyName: 'Renault Maroc',
      category: 'automotive',
      urls: ['https://www.renault.ma/carrieres'],
      tags: ['automotive', 'renault'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class StellantisScraper extends BaseScraper {
  readonly sourceName = 'stellantis';
  readonly category = 'automotive' as const;
  readonly companyName = 'Stellantis';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'stellantis',
      companyName: 'Stellantis',
      category: 'automotive',
      urls: ['https://www.stellantis.com/en/careers'],
      tags: ['automotive', 'stellantis'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class AutohallScraper extends BaseScraper {
  readonly sourceName = 'autohall';
  readonly category = 'automotive' as const;
  readonly companyName = 'Auto Hall';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'autohall',
      companyName: 'Auto Hall',
      category: 'automotive',
      urls: ['https://www.autohall.ma/carrieres'],
      tags: ['automotive', 'autohall'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
