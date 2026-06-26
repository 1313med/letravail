import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import { BaseScraper } from '../base.scraper.js';
import { fetchAtsCareerJobs } from '../../adapters/ats-career-scraper.js';
import { fetchIntelciaJobs } from '../../adapters/intelcia.adapter.js';
import { createGenericScraper } from '../generic.scraper.js';

class BpoScraper extends BaseScraper {
  readonly sourceName: string;
  readonly companyName: string;
  readonly category = 'technology' as const;
  private readonly atsConfig: Parameters<typeof fetchAtsCareerJobs>[0];
  private readonly genericInner: ReturnType<typeof createGenericScraper>;

  constructor(
    config: Parameters<typeof fetchAtsCareerJobs>[0] & { careerUrls: string[]; tags: string[]; defaultCity?: string },
    pagePool?: PagePool,
  ) {
    super(pagePool);
    this.sourceName = config.sourceName;
    this.companyName = config.companyName;
    this.atsConfig = config;
    this.genericInner = createGenericScraper({
      sourceName: config.sourceName,
      companyName: config.companyName,
      category: 'technology',
      urls: config.careerUrls,
      tags: config.tags,
      defaultCity: config.defaultCity ?? 'Casablanca',
    });
  }

  async scrape(): Promise<Job[]> {
    if (this.sourceName === 'intelcia') {
      const jobs = await fetchIntelciaJobs({
        sourceName: this.sourceName,
        companyName: this.companyName,
        tags: this.atsConfig.tags,
        defaultCity: this.atsConfig.defaultCity,
      });
      if (jobs.length > 0) return jobs;
    }
    const apiJobs = await fetchAtsCareerJobs(this.atsConfig, this.pagePool);
    if (apiJobs.length > 0) return apiJobs;
    return this.genericInner.scrapeWithPool(this.pagePool);
  }
}

export class IntelciaScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'intelcia',
      companyName: 'Intelcia',
      careerUrls: [
        'https://careers.intelcia.com/fr-ma/offres-emploi?sp=true',
        'https://www.intelcia.com/fr/nous-rejoindre/',
      ],
      tags: ['bpo', 'call-center', 'intelcia'],
    }, pagePool);
  }
}

export class TeleperformanceScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'teleperformance-maroc',
      companyName: 'Teleperformance Maroc',
      careerUrls: [
        'https://jobs.teleperformance.com/en-us/search-jobs/Morocco',
        'https://www.teleperformance.com/en-us/careers/',
      ],
      tags: ['bpo', 'call-center', 'teleperformance'],
    }, pagePool);
  }
}

export class FoundeverScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'foundever-maroc',
      companyName: 'Foundever Maroc',
      careerUrls: ['https://jobs.foundever.com/', 'https://www.foundever.com/careers/'],
      tags: ['bpo', 'call-center', 'foundever', 'sitel'],
    }, pagePool);
  }
}

export class ConcentrixScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'concentrix-maroc',
      companyName: 'Concentrix Maroc',
      careerUrls: ['https://jobs.concentrix.com/global/en/search-results'],
      tags: ['bpo', 'call-center', 'concentrix'],
    }, pagePool);
  }
}

export class WebhelpScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'webhelp-maroc',
      companyName: 'Webhelp Maroc',
      careerUrls: ['https://www.webhelp.com/careers/', 'https://jobs.webhelp.com/'],
      tags: ['bpo', 'call-center', 'webhelp'],
    }, pagePool);
  }
}

export class ComdataScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'comdata',
      companyName: 'Comdata',
      careerUrls: [
        'https://www.comdatagroup.com/fr/carrieres',
        'https://www.comdatagroup.com/fr/carrieres/offres-emploi',
      ],
      tags: ['bpo', 'call-center', 'comdata'],
    }, pagePool);
  }
}

export class MajorelScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'majorel-maroc',
      companyName: 'Majorel Maroc',
      careerUrls: ['https://jobs.majorel.com/', 'https://www.majorel.com/careers/'],
      tags: ['bpo', 'call-center', 'majorel'],
    }, pagePool);
  }
}

export class OutsourciaScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'outsourcia',
      companyName: 'Outsourcia',
      careerUrls: ['https://www.outsourcia.com/carrieres/'],
      tags: ['bpo', 'call-center', 'outsourcia'],
    }, pagePool);
  }
}

export class XceedScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'xceed-maroc',
      companyName: 'Xceed Maroc',
      careerUrls: ['https://xceedcc.com/careers/'],
      tags: ['bpo', 'call-center', 'xceed'],
    }, pagePool);
  }
}

export class AdmValueScraper extends BpoScraper {
  constructor(pagePool?: PagePool) {
    super({
      sourceName: 'adm-value',
      companyName: 'ADM Value',
      careerUrls: ['https://www.admvalue.com/carrieres/'],
      tags: ['bpo', 'adm-value'],
    }, pagePool);
  }
}

export const BPO_SCRAPERS = [
  IntelciaScraper, TeleperformanceScraper, FoundeverScraper, ConcentrixScraper,
  WebhelpScraper, ComdataScraper, MajorelScraper, OutsourciaScraper, XceedScraper, AdmValueScraper,
];
