import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class MohammedVScraper extends BaseScraper {
  readonly sourceName = 'universite-mohammed-v';
  readonly category = 'universities' as const;
  readonly companyName = 'Université Mohammed V';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'universite-mohammed-v',
      companyName: 'Université Mohammed V',
      category: 'universities',
      urls: ['https://www.um5.ac.ma/'],
      tags: ['universities', 'education', 'um5'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class HassanIIScraper extends BaseScraper {
  readonly sourceName = 'universite-hassan-ii';
  readonly category = 'universities' as const;
  readonly companyName = 'Université Hassan II';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'universite-hassan-ii',
      companyName: 'Université Hassan II',
      category: 'universities',
      urls: ['https://www.univh2c.ma/'],
      tags: ['universities', 'education', 'uh2c'],
      defaultCity: 'Casablanca',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class CadiAyyadScraper extends BaseScraper {
  readonly sourceName = 'universite-cadi-ayyad';
  readonly category = 'universities' as const;
  readonly companyName = 'Université Cadi Ayyad';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'universite-cadi-ayyad',
      companyName: 'Université Cadi Ayyad',
      category: 'universities',
      urls: ['https://www.uca.ma/'],
      tags: ['universities', 'education', 'uca'],
      defaultCity: 'Marrakech',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
