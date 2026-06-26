import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class InwiScraper extends BaseScraper {
  readonly sourceName = 'inwi';
  readonly category = 'telecom' as const;
  readonly companyName = 'Inwi';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'inwi',
      companyName: 'Inwi',
      category: 'telecom',
      urls: ['https://inwi.ma/fr/carrieres', 'https://carrieres.inwi.ma'],
      tags: ['telecom', 'inwi'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class MarocTelecomScraper extends BaseScraper {
  readonly sourceName = 'maroc-telecom';
  readonly category = 'telecom' as const;
  readonly companyName = 'Maroc Telecom';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'maroc-telecom',
      companyName: 'Maroc Telecom',
      category: 'telecom',
      urls: [
        'https://www.iam.ma/groupe-iam/carrieres',
        'https://www.maroctelecom.ma/carrieres',
      ],
      tags: ['telecom', 'iam'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class OrangeScraper extends BaseScraper {
  readonly sourceName = 'orange-maroc';
  readonly category = 'telecom' as const;
  readonly companyName = 'Orange Maroc';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'orange-maroc',
      companyName: 'Orange Maroc',
      category: 'telecom',
      urls: [
        'https://www.orange.ma/fr/orange-carrieres',
        'https://orange.jobs/fr_FR/home',
      ],
      tags: ['telecom', 'orange'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
