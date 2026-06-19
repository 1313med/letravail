import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { createGenericScraper } from '../generic.scraper.js';

export class AnapecScraper extends BaseScraper {
  readonly sourceName = 'anapec';
  readonly category = 'government' as const;
  readonly companyName = 'ANAPEC';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'anapec',
      companyName: 'ANAPEC',
      category: 'government',
      urls: ['https://www.anapec.org/'],
      tags: ['government', 'anapec', 'public'],
      defaultCity: 'Casablanca',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class EmploiPublicScraper extends BaseScraper {
  readonly sourceName = 'emploi-public';
  readonly category = 'government' as const;
  readonly companyName = 'Emploi Public';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'emploi-public',
      companyName: 'Emploi Public',
      category: 'government',
      urls: ['https://www.emploi-public.ma/'],
      tags: ['government', 'public', 'fonction-publique'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class MinistereSanteScraper extends BaseScraper {
  readonly sourceName = 'ministere-sante';
  readonly category = 'government' as const;
  readonly companyName = 'Ministère de la Santé';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'ministere-sante',
      companyName: 'Ministère de la Santé',
      category: 'government',
      urls: ['https://www.sante.gov.ma/'],
      tags: ['government', 'sante'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class MinistereEducationScraper extends BaseScraper {
  readonly sourceName = 'ministere-education';
  readonly category = 'government' as const;
  readonly companyName = "Ministère de l'Éducation Nationale";
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'ministere-education',
      companyName: "Ministère de l'Éducation Nationale",
      category: 'government',
      urls: ['https://www.men.gov.ma/'],
      tags: ['government', 'education'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class MinistereJusticeScraper extends BaseScraper {
  readonly sourceName = 'ministere-justice';
  readonly category = 'government' as const;
  readonly companyName = 'Ministère de la Justice';
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'ministere-justice',
      companyName: 'Ministère de la Justice',
      category: 'government',
      urls: ['https://www.justice.gov.ma/'],
      tags: ['government', 'justice'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}

export class MinistereInterieurScraper extends BaseScraper {
  readonly sourceName = 'ministere-interieur';
  readonly category = 'government' as const;
  readonly companyName = "Ministère de l'Intérieur";
  private readonly inner;

  constructor(pagePool?: PagePool) {
    super(pagePool);
    this.inner = createGenericScraper({
      sourceName: 'ministere-interieur',
      companyName: "Ministère de l'Intérieur",
      category: 'government',
      urls: ['https://www.interieur.gov.ma/'],
      tags: ['government', 'interieur'],
      defaultCity: 'Rabat',
    });
  }

  async scrape(): Promise<Job[]> {
    return this.inner.scrapeWithPool(this.pagePool);
  }
}
