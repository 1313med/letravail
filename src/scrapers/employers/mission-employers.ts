/**
 * Config-driven Moroccan employers — one adapter config per employer, no custom scraper classes.
 */
import type { ScrapeCategory } from '../../config/index.js';
import type { AtsCareerConfig } from '../../adapters/ats-career-scraper.js';
import { AtsEmployerScraper } from './ats-employer.scraper.js';
import type { PagePool } from '../../lib/browser/page-pool.js';
import type { BaseScraper } from '../base.scraper.js';

type EmployerConfig = AtsCareerConfig & {
  category: 'banks' | 'technology' | 'retail' | 'automotive' | 'government' | 'telecom' | 'airlines';
};

export const MISSION_EMPLOYER_CONFIGS: EmployerConfig[] = [
  // Banks — missing from individual scrapers
  {
    sourceName: 'bank-assafa',
    companyName: 'Bank Assafa',
    category: 'banks',
    careerUrls: ['https://www.bankassafa.com/fr/carrieres', 'https://www.bankassafa.com/recrutement'],
    tags: ['banks', 'assafa'],
    defaultCity: 'Casablanca',
  },
  {
    sourceName: 'umnia-bank',
    companyName: 'Umnia Bank',
    category: 'banks',
    careerUrls: ['https://www.umniabank.com/fr/carrieres', 'https://www.umniabank.com/recrutement'],
    tags: ['banks', 'umnia'],
    defaultCity: 'Casablanca',
  },
  {
    sourceName: 'bank-al-yousr',
    companyName: 'Bank Al Yousr',
    category: 'banks',
    careerUrls: ['https://www.bankalyousr.ma/fr/carrieres', 'https://www.bankalyousr.ma/recrutement'],
    tags: ['banks', 'alyousr'],
    defaultCity: 'Casablanca',
  },
  // Tech — planned catalog entries
  {
    sourceName: 'inetum-maroc',
    companyName: 'Inetum Maroc',
    category: 'technology',
    careerUrls: ['https://www.inetum.com/fr/maroc/carrieres', 'https://careers.inetum.com/'],
    tags: ['technology', 'inetum'],
  },
  {
    sourceName: 'sqli-maroc',
    companyName: 'SQLI Maroc',
    category: 'technology',
    careerUrls: ['https://www.sqli.com/int-en/carrieres', 'https://www.sqli.com/int-en/join-us'],
    tags: ['technology', 'sqli'],
  },
  {
    sourceName: 'devoteam-maroc',
    companyName: 'Devoteam Maroc',
    category: 'technology',
    careerUrls: ['https://www.devoteam.com/careers/', 'https://careers.devoteam.com/'],
    tags: ['technology', 'devoteam'],
  },
  {
    sourceName: 'oracle-morocco',
    companyName: 'Oracle Morocco',
    category: 'technology',
    careerUrls: ['https://careers.oracle.com/en/sites/jobsearch/jobs?location=Morocco'],
    tags: ['technology', 'oracle'],
  },
  {
    sourceName: 'ibm-morocco',
    companyName: 'IBM Morocco',
    category: 'technology',
    careerUrls: ['https://www.ibm.com/careers/search?field_keyword_08%5B0%5D=Morocco'],
    tags: ['technology', 'ibm'],
  },
  // Industry
  {
    sourceName: 'safran-maroc',
    companyName: 'Safran Maroc',
    category: 'automotive',
    careerUrls: ['https://www.safran-group.com/fr/carrieres', 'https://jobs.safrangroup.com/'],
    tags: ['industry', 'safran'],
  },
  {
    sourceName: 'lear-maroc',
    companyName: 'Lear Corporation Maroc',
    category: 'automotive',
    careerUrls: ['https://www.lear.com/careers', 'https://careers.lear.com/'],
    tags: ['industry', 'lear', 'automotive'],
  },
  {
    sourceName: 'aptiv-maroc',
    companyName: 'Aptiv Maroc',
    category: 'automotive',
    careerUrls: ['https://www.aptiv.com/careers', 'https://aptiv.wd5.myworkdayjobs.com/APTIV_CAREERS'],
    tags: ['industry', 'aptiv'],
    workday: { host: 'aptiv.wd5.myworkdayjobs.com', tenant: 'aptiv', site: 'APTIV_CAREERS' },
  },
  {
    sourceName: 'yazaki-maroc',
    companyName: 'Yazaki Maroc',
    category: 'automotive',
    careerUrls: ['https://www.yazaki-group.com/global/careers/', 'https://careers.yazaki-europe.com/'],
    tags: ['industry', 'yazaki'],
  },
  {
    sourceName: 'sumitomo-maroc',
    companyName: 'Sumitomo Electric Maroc',
    category: 'automotive',
    careerUrls: ['https://sumitomoelectric.com/careers/'],
    tags: ['industry', 'sumitomo'],
  },
  // Logistics
  {
    sourceName: 'aramex-maroc',
    companyName: 'Aramex Maroc',
    category: 'technology',
    careerUrls: ['https://www.aramex.com/ma/en/careers', 'https://careers.aramex.com/'],
    tags: ['logistics', 'aramex'],
  },
  {
    sourceName: 'maersk-maroc',
    companyName: 'Maersk Maroc',
    category: 'technology',
    careerUrls: ['https://www.maersk.com/careers', 'https://jobs.maersk.com/'],
    tags: ['logistics', 'maersk'],
  },
  {
    sourceName: 'bollore-maroc',
    companyName: 'Bolloré Logistics Maroc',
    category: 'technology',
    careerUrls: ['https://www.bollore-logistics.com/en/careers/', 'https://careers.bollore.com/'],
    tags: ['logistics', 'bollore'],
  },
  // Retail
  {
    sourceName: 'electroplanet',
    companyName: 'Electroplanet',
    category: 'retail',
    careerUrls: ['https://www.electroplanet.ma/carrieres', 'https://www.electroplanet.ma/recrutement'],
    tags: ['retail', 'electroplanet'],
  },
  // Aviation
  {
    sourceName: 'air-arabia-maroc',
    companyName: 'Air Arabia Maroc',
    category: 'airlines',
    careerUrls: ['https://www.airarabia.com/fr/carrieres', 'https://careers.airarabia.com/'],
    tags: ['aviation', 'air-arabia'],
  },
  // Public
  {
    sourceName: 'marsa-maroc',
    companyName: 'Marsa Maroc',
    category: 'government',
    careerUrls: ['https://www.marsamaroc.co.ma/fr/carrieres', 'https://www.marsamaroc.co.ma/recrutement'],
    tags: ['public', 'marsa-maroc', 'logistics'],
  },
];

export function createMissionEmployerRegistrations(): Array<{
  sourceName: string;
  category: ScrapeCategory;
  factory: (pagePool: PagePool) => BaseScraper;
}> {
  return MISSION_EMPLOYER_CONFIGS.map((config) => ({
    sourceName: config.sourceName,
    category: config.category as ScrapeCategory,
    factory: (pagePool: PagePool) => new AtsEmployerScraper(config, pagePool),
  }));
}
