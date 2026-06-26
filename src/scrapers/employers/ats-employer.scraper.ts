import type { Job } from '../../types/job.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import type { ScrapeCategory } from '../../config/index.js';
import { BaseScraper } from '../base.scraper.js';
import { fetchAtsCareerJobs, type AtsCareerConfig } from '../../adapters/ats-career-scraper.js';

class AtsEmployerScraper extends BaseScraper {
  readonly sourceName: string;
  readonly companyName: string;
  readonly category: 'banks' | 'technology' | 'retail' | 'automotive' | 'government' | 'telecom';
  private readonly config: AtsCareerConfig & { category?: ScrapeCategory };

  constructor(
    config: AtsCareerConfig & { category: AtsEmployerScraper['category'] },
    pagePool?: PagePool,
  ) {
    super(pagePool);
    this.config = { ...config, category: config.category };
    this.sourceName = config.sourceName;
    this.companyName = config.companyName;
    this.category = config.category;
  }

  async scrape(): Promise<Job[]> {
    return fetchAtsCareerJobs(this.config, this.pagePool);
  }
}

export class BanquePopulaireScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'banque-populaire',
        companyName: 'Banque Populaire',
        category: 'banks',
        careerUrls: [
          'https://bcp-cand.talent-soft.com/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=layer',
          'https://bcp-cand.talent-soft.com/',
        ],
        tags: ['banks', 'banque-populaire', 'bcp'],
      },
      pagePool,
    );
  }
}

export class CreditDuMarocScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'credit-du-maroc',
        companyName: 'Crédit du Maroc',
        category: 'banks',
        careerUrls: [
          'https://www.creditdumaroc.ma/fr/carrieres',
          'https://career2.successfactors.eu/career?company=creditdum',
        ],
        tags: ['banks', 'credit-du-maroc'],
      },
      pagePool,
    );
  }
}

export class CreditAgricoleScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'credit-agricole-maroc',
        companyName: 'Crédit Agricole du Maroc',
        category: 'banks',
        careerUrls: [
          'https://www.creditagricole.ma/fr/carrieres',
          'https://www.creditagricole.ma/recrutement',
        ],
        tags: ['banks', 'credit-agricole'],
      },
      pagePool,
    );
  }
}

export class SocieteGeneraleScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'societe-generale-maroc',
        companyName: 'Société Générale Maroc',
        category: 'banks',
        careerUrls: [
          'https://careers.societegenerale.com/offres-emploi/maroc',
          'https://www.sgmaroc.com/carrieres',
        ],
        tags: ['banks', 'societe-generale'],
      },
      pagePool,
    );
  }
}

export class CfgBankScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'cfg-bank',
        companyName: 'CFG Bank',
        category: 'banks',
        careerUrls: ['https://www.cfgbank.com/carrieres', 'https://www.cfgbank.com/fr/carrieres'],
        tags: ['banks', 'cfg'],
      },
      pagePool,
    );
  }
}

export class AlBaridBankScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'al-barid-bank',
        companyName: 'Al Barid Bank',
        category: 'banks',
        careerUrls: ['https://www.albaridbank.ma/carrieres', 'https://www.albaridbank.ma/recrutement'],
        tags: ['banks', 'al-barid'],
      },
      pagePool,
    );
  }
}

export class AccentureScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'accenture-maroc',
        companyName: 'Accenture Maroc',
        category: 'technology',
        careerUrls: [
          'https://www.accenture.com/ma-fr/careers',
          'https://www.accenture.com/careers',
        ],
        tags: ['consulting', 'accenture'],
        workday: { host: 'accenture.wd103.myworkdayjobs.com', tenant: 'accenture', site: 'AccentureCareers' },
      },
      pagePool,
    );
  }
}

export class DeloitteScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'deloitte-maroc',
        companyName: 'Deloitte Maroc',
        category: 'technology',
        careerUrls: ['https://www2.deloitte.com/ma/fr/pages/careers/topics/careers.html'],
        tags: ['consulting', 'deloitte'],
      },
      pagePool,
    );
  }
}

export class OcpGroupScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'ocp-group',
        companyName: 'OCP Group',
        category: 'automotive',
        careerUrls: ['https://www.ocpgroup.ma/carrieres', 'https://jobs.ocpgroup.ma/'],
        tags: ['industry', 'ocp', 'mining'],
      },
      pagePool,
    );
  }
}

export class OncfScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'oncf',
        companyName: 'ONCF',
        category: 'government',
        careerUrls: ['https://www.oncf.ma/fr/carrieres', 'https://www.oncf.ma/recrutement'],
        tags: ['public', 'oncf', 'transport'],
      },
      pagePool,
    );
  }
}

export class DecathlonScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'decathlon-maroc',
        companyName: 'Decathlon Maroc',
        category: 'retail',
        careerUrls: ['https://recrute.decathlon.fr/maroc', 'https://www.decathlon.ma/carrieres'],
        tags: ['retail', 'decathlon'],
      },
      pagePool,
    );
  }
}

export class IkeaScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'ikea-maroc',
        companyName: 'IKEA Maroc',
        category: 'retail',
        careerUrls: ['https://www.ikea.com/ma/fr/this-is-ikea/work-with-us/'],
        tags: ['retail', 'ikea'],
      },
      pagePool,
    );
  }
}

export class PwcScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'pwc-maroc',
        companyName: 'PwC Maroc',
        category: 'technology',
        careerUrls: ['https://www.pwc.com/m1/en/careers.html', 'https://jobs-pwc.icims.com/'],
        tags: ['consulting', 'pwc'],
      },
      pagePool,
    );
  }
}

export class EyScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'ey-maroc',
        companyName: 'EY Maroc',
        category: 'technology',
        careerUrls: ['https://careers.ey.com/ey/search?optionsFacetsDD_country=MA'],
        tags: ['consulting', 'ey'],
      },
      pagePool,
    );
  }
}

export class KpmgScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'kpmg-maroc',
        companyName: 'KPMG Maroc',
        category: 'technology',
        careerUrls: ['https://home.kpmg/ma/fr/home/careers.html'],
        tags: ['consulting', 'kpmg'],
      },
      pagePool,
    );
  }
}

export class ManagemScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'managem',
        companyName: 'Managem',
        category: 'automotive',
        careerUrls: ['https://www.managemgroup.com/carrieres/', 'https://www.managemgroup.com/fr/carrieres'],
        tags: ['industry', 'mining', 'managem'],
      },
      pagePool,
    );
  }
}

export class DhlScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'dhl-maroc',
        companyName: 'DHL Maroc',
        category: 'technology',
        careerUrls: ['https://careers.dhl.com/global/en/search-results?keywords=morocco'],
        tags: ['logistics', 'dhl'],
      },
      pagePool,
    );
  }
}

export class AdmValueScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'adm-value',
        companyName: 'ADM Value',
        category: 'technology',
        careerUrls: ['https://www.admvalue.com/carrieres/', 'https://admvalue.com/recrutement/'],
        tags: ['bpo', 'adm-value'],
      },
      pagePool,
    );
  }
}

export class OneeScraper extends AtsEmployerScraper {
  constructor(pagePool?: PagePool) {
    super(
      {
        sourceName: 'onee',
        companyName: 'ONEE',
        category: 'government',
        careerUrls: ['https://www.one.org.ma/FR/recrutement.aspx', 'https://www.onee.ma/carrieres'],
        tags: ['public', 'onee', 'energy'],
      },
      pagePool,
    );
  }
}
