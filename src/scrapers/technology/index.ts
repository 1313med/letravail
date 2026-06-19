import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class CapgeminiScraper extends BaseScraper {
  readonly sourceName = 'capgemini';
  readonly category = 'technology' as const;
  readonly companyName = 'Capgemini';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'capgemini',
      companyName: 'Capgemini',
      category: 'technology',
      urls: ['https://www.capgemini.com/ma-fr/carrieres/', 'https://www.capgemini.com/careers/'],
      tags: ['technology', 'capgemini'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class CgiScraper extends BaseScraper {
  readonly sourceName = 'cgi';
  readonly category = 'technology' as const;
  readonly companyName = 'CGI';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'cgi',
      companyName: 'CGI',
      category: 'technology',
      urls: ['https://www.cgi.com/en/careers'],
      tags: ['technology', 'cgi'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class DxcScraper extends BaseScraper {
  readonly sourceName = 'dxc-technology';
  readonly category = 'technology' as const;
  readonly companyName = 'DXC Technology';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'dxc-technology',
      companyName: 'DXC Technology',
      category: 'technology',
      urls: ['https://careers.dxc.com/'],
      tags: ['technology', 'dxc'],
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
