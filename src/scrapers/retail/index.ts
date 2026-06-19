import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class MarjaneScraper extends BaseScraper {
  readonly sourceName = 'marjane';
  readonly category = 'retail' as const;
  readonly companyName = 'Marjane';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'marjane',
      companyName: 'Marjane',
      category: 'retail',
      urls: ['https://www.marjane.ma/carrieres'],
      tags: ['retail', 'marjane'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class BimScraper extends BaseScraper {
  readonly sourceName = 'bim';
  readonly category = 'retail' as const;
  readonly companyName = 'BIM';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'bim',
      companyName: 'BIM',
      category: 'retail',
      urls: ['https://www.bim.ma/carrieres'],
      tags: ['retail', 'bim'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class LabelvieScraper extends BaseScraper {
  readonly sourceName = 'labelvie';
  readonly category = 'retail' as const;
  readonly companyName = 'LabelVie';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'labelvie',
      companyName: 'LabelVie',
      category: 'retail',
      urls: ['https://www.labelvie.ma/carrieres'],
      tags: ['retail', 'labelvie'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
