/**
 * Moroccan employment source catalog — active + planned employers.
 * Each entry defines onboarding metadata for the data acquisition platform.
 */
import type { ScrapeCategory } from '../config/index.js';
import type { AtsPlatform } from './ats-registry.js';

export interface SourceCatalogEntry {
  sourceName: string;
  companyName: string;
  category: ScrapeCategory;
  sector: string;
  status: 'active' | 'planned' | 'research';
  careerPageUrl?: string;
  atsPlatform?: AtsPlatform;
  estimatedMonthlyJobs: number;
  priority: number;
}

export const MOROCCO_SOURCE_CATALOG: SourceCatalogEntry[] = [
  // Active
  { sourceName: 'cih-bank', companyName: 'CIH Bank', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://recrutement.cihbank.ma', estimatedMonthlyJobs: 400, priority: 100 },
  { sourceName: 'attijariwafa-bank', companyName: 'Attijariwafa Bank', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://attijariwafabank.csod.com', atsPlatform: 'csod', estimatedMonthlyJobs: 50, priority: 95 },
  { sourceName: 'linkedin', companyName: 'LinkedIn Morocco', category: 'linkedin', sector: 'aggregator', status: 'active', estimatedMonthlyJobs: 2000, priority: 98 },
  { sourceName: 'bmci', companyName: 'BMCI', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.bmci.ma/fr/carrieres', priority: 70, estimatedMonthlyJobs: 30 },
  { sourceName: 'bank-of-africa', companyName: 'Bank of Africa', category: 'banks', sector: 'banks', status: 'active', priority: 70, estimatedMonthlyJobs: 40 },
  { sourceName: 'dxc-technology', companyName: 'DXC Technology', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://careers.dxc.com', priority: 65, estimatedMonthlyJobs: 20 },
  { sourceName: 'capgemini', companyName: 'Capgemini', category: 'technology', sector: 'technology', status: 'active', priority: 60, estimatedMonthlyJobs: 80 },
  { sourceName: 'cgi', companyName: 'CGI', category: 'technology', sector: 'technology', status: 'active', priority: 60, estimatedMonthlyJobs: 60 },
  { sourceName: 'inwi', companyName: 'Inwi', category: 'telecom', sector: 'telecom', status: 'active', careerPageUrl: 'https://inwi.ma/fr/carrieres', priority: 55, estimatedMonthlyJobs: 40 },
  { sourceName: 'maroc-telecom', companyName: 'Maroc Telecom', category: 'telecom', sector: 'telecom', status: 'active', careerPageUrl: 'https://www.iam.ma/groupe-iam/carrieres', priority: 55, estimatedMonthlyJobs: 50 },
  { sourceName: 'orange-maroc', companyName: 'Orange Maroc', category: 'telecom', sector: 'telecom', status: 'active', careerPageUrl: 'https://www.orange.ma/fr/orange-carrieres', priority: 55, estimatedMonthlyJobs: 35 },
  { sourceName: 'anapec', companyName: 'ANAPEC', category: 'government', sector: 'government', status: 'active', priority: 75, estimatedMonthlyJobs: 500 },
  { sourceName: 'royal-air-maroc', companyName: 'Royal Air Maroc', category: 'airlines', sector: 'aviation', status: 'active', priority: 50, estimatedMonthlyJobs: 30 },
  { sourceName: 'renault-maroc', companyName: 'Renault Maroc', category: 'automotive', sector: 'automotive', status: 'active', priority: 50, estimatedMonthlyJobs: 25 },
  { sourceName: 'stellantis', companyName: 'Stellantis', category: 'automotive', sector: 'automotive', status: 'active', priority: 50, estimatedMonthlyJobs: 20 },
  { sourceName: 'marjane', companyName: 'Marjane', category: 'retail', sector: 'retail', status: 'active', priority: 45, estimatedMonthlyJobs: 40 },
  { sourceName: 'labelvie', companyName: 'LabelVie', category: 'retail', sector: 'retail', status: 'active', priority: 45, estimatedMonthlyJobs: 30 },
  // Planned — Banks (Sprint 3 active)
  { sourceName: 'banque-populaire', companyName: 'Banque Populaire', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://bcp-cand.talent-soft.com/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=layer', atsPlatform: 'talentsoft', priority: 88, estimatedMonthlyJobs: 100 },
  { sourceName: 'credit-du-maroc', companyName: 'Crédit du Maroc', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://carriere.creditdumaroc.ma/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=list', atsPlatform: 'talentsoft', priority: 82, estimatedMonthlyJobs: 190 },
  { sourceName: 'credit-agricole-maroc', companyName: 'Crédit Agricole du Maroc', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.creditagricole.ma/fr/carrieres', priority: 80, estimatedMonthlyJobs: 50 },
  { sourceName: 'societe-generale-maroc', companyName: 'Société Générale Maroc', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://careers.societegenerale.com/offres-emploi/maroc', priority: 78, estimatedMonthlyJobs: 40 },
  { sourceName: 'cfg-bank', companyName: 'CFG Bank', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.cfgbank.com/fr/carrieres', priority: 72, estimatedMonthlyJobs: 30 },
  { sourceName: 'al-barid-bank', companyName: 'Al Barid Bank', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.albaridbank.ma/carrieres', priority: 70, estimatedMonthlyJobs: 35 },
  { sourceName: 'accenture-maroc', companyName: 'Accenture Maroc', category: 'technology', sector: 'consulting', status: 'active', atsPlatform: 'workday', priority: 76, estimatedMonthlyJobs: 90 },
  { sourceName: 'deloitte-maroc', companyName: 'Deloitte Maroc', category: 'technology', sector: 'consulting', status: 'active', priority: 74, estimatedMonthlyJobs: 70 },
  { sourceName: 'ocp-group', companyName: 'OCP Group', category: 'automotive', sector: 'industry', status: 'active', priority: 85, estimatedMonthlyJobs: 120 },
  { sourceName: 'oncf', companyName: 'ONCF', category: 'government', sector: 'transport', status: 'active', priority: 65, estimatedMonthlyJobs: 40 },
  { sourceName: 'decathlon-maroc', companyName: 'Decathlon Maroc', category: 'retail', sector: 'retail', status: 'active', priority: 62, estimatedMonthlyJobs: 40 },
  { sourceName: 'ikea-maroc', companyName: 'IKEA Maroc', category: 'retail', sector: 'retail', status: 'active', priority: 58, estimatedMonthlyJobs: 25 },
  // Planned — remaining
  { sourceName: 'pwc-maroc', companyName: 'PwC Maroc', category: 'technology', sector: 'consulting', status: 'active', priority: 68, estimatedMonthlyJobs: 60 },
  { sourceName: 'ey-maroc', companyName: 'EY Maroc', category: 'technology', sector: 'consulting', status: 'active', priority: 68, estimatedMonthlyJobs: 55 },
  { sourceName: 'kpmg-maroc', companyName: 'KPMG Maroc', category: 'technology', sector: 'consulting', status: 'active', priority: 68, estimatedMonthlyJobs: 50 },
  { sourceName: 'dhl-maroc', companyName: 'DHL Maroc', category: 'technology', sector: 'logistics', status: 'active', priority: 55, estimatedMonthlyJobs: 30 },
  { sourceName: 'managem', companyName: 'Managem', category: 'automotive', sector: 'industry', status: 'active', priority: 55, estimatedMonthlyJobs: 30 },
  { sourceName: 'adm-value', companyName: 'ADM Value', category: 'technology', sector: 'bpo', status: 'active', priority: 60, estimatedMonthlyJobs: 50 },
  { sourceName: 'onee', companyName: 'ONEE', category: 'government', sector: 'government', status: 'active', priority: 55, estimatedMonthlyJobs: 25 },
  // Planned — remaining
  { sourceName: 'inetum-maroc', companyName: 'Inetum Maroc', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://www.inetum.com/fr/maroc/carrieres', priority: 60, estimatedMonthlyJobs: 40 },
  { sourceName: 'sqli-maroc', companyName: 'SQLI Maroc', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://www.sqli.com/int-en/carrieres', priority: 58, estimatedMonthlyJobs: 35 },
  { sourceName: 'devoteam-maroc', companyName: 'Devoteam Maroc', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://www.devoteam.com/careers/', priority: 58, estimatedMonthlyJobs: 30 },
  // Planned — BPO / Call Centers (high priority)
  { sourceName: 'intelcia', companyName: 'Intelcia', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://careers.intelcia.com/fr-ma/offres-emploi?sp=true', atsPlatform: 'successfactors', priority: 90, estimatedMonthlyJobs: 200 },
  { sourceName: 'teleperformance-maroc', companyName: 'Teleperformance Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://jobs.teleperformance.com/', priority: 88, estimatedMonthlyJobs: 300 },
  { sourceName: 'foundever-maroc', companyName: 'Foundever Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://jobs.foundever.com/', priority: 85, estimatedMonthlyJobs: 250 },
  { sourceName: 'concentrix-maroc', companyName: 'Concentrix Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://jobs.concentrix.com/', priority: 85, estimatedMonthlyJobs: 200 },
  { sourceName: 'webhelp-maroc', companyName: 'Webhelp Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://www.webhelp.com/careers/', priority: 82, estimatedMonthlyJobs: 150 },
  { sourceName: 'comdata', companyName: 'Comdata', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://www.comdatagroup.com/fr/carrieres', priority: 80, estimatedMonthlyJobs: 120 },
  { sourceName: 'majorel-maroc', companyName: 'Majorel Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://jobs.majorel.com/', priority: 78, estimatedMonthlyJobs: 100 },
  { sourceName: 'outsourcia', companyName: 'Outsourcia', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://www.outsourcia.com/carrieres/', priority: 70, estimatedMonthlyJobs: 80 },
  { sourceName: 'xceed-maroc', companyName: 'Xceed Maroc', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://xceedcc.com/careers/', priority: 65, estimatedMonthlyJobs: 60 },
  { sourceName: 'phone-group', companyName: 'Phone Group', category: 'technology', sector: 'bpo', status: 'planned', priority: 55, estimatedMonthlyJobs: 40 },
  { sourceName: 'fusion-bpo', companyName: 'Fusion BPO', category: 'technology', sector: 'bpo', status: 'planned', priority: 55, estimatedMonthlyJobs: 40 },
  { sourceName: 'crm-value', companyName: 'CRM Value', category: 'technology', sector: 'bpo', status: 'planned', priority: 50, estimatedMonthlyJobs: 35 },
  { sourceName: 'co-managers', companyName: 'Co Managers', category: 'technology', sector: 'bpo', status: 'planned', priority: 50, estimatedMonthlyJobs: 30 },
  { sourceName: 'h2mw-groupe', companyName: 'H2MW Groupe', category: 'technology', sector: 'bpo', status: 'planned', priority: 48, estimatedMonthlyJobs: 30 },
  { sourceName: 'simply-call', companyName: 'Simply Call', category: 'technology', sector: 'bpo', status: 'planned', priority: 45, estimatedMonthlyJobs: 25 },
  { sourceName: 'right-place-call', companyName: 'Right Place Call', category: 'technology', sector: 'bpo', status: 'planned', priority: 45, estimatedMonthlyJobs: 25 },
  { sourceName: 'eca-assurances', companyName: 'ECA Assurances', category: 'technology', sector: 'bpo', status: 'planned', priority: 45, estimatedMonthlyJobs: 25 },
  { sourceName: 'access-teleservices', companyName: 'Access Teleservices', category: 'technology', sector: 'bpo', status: 'planned', priority: 45, estimatedMonthlyJobs: 25 },
  { sourceName: 'myopla', companyName: 'MyOpla', category: 'technology', sector: 'bpo', status: 'planned', priority: 42, estimatedMonthlyJobs: 20 },
  // Planned — Industry
  { sourceName: 'ocp-group', companyName: 'OCP Group', category: 'automotive', sector: 'industry', status: 'planned', priority: 78, estimatedMonthlyJobs: 120 },
  { sourceName: 'oncf', companyName: 'ONCF', category: 'government', sector: 'transport', status: 'planned', priority: 60, estimatedMonthlyJobs: 40 },
  { sourceName: 'managem', companyName: 'Managem', category: 'automotive', sector: 'mining', status: 'planned', priority: 55, estimatedMonthlyJobs: 30 },
  // Planned — Retail
  { sourceName: 'decathlon-maroc', companyName: 'Decathlon Maroc', category: 'retail', sector: 'retail', status: 'planned', priority: 55, estimatedMonthlyJobs: 40 },
  { sourceName: 'ikea-maroc', companyName: 'IKEA Maroc', category: 'retail', sector: 'retail', status: 'planned', priority: 50, estimatedMonthlyJobs: 25 },
  // Planned — Aviation
  { sourceName: 'air-arabia-maroc', companyName: 'Air Arabia Maroc', category: 'airlines', sector: 'aviation', status: 'active', careerPageUrl: 'https://www.airarabia.com/fr/carrieres', priority: 50, estimatedMonthlyJobs: 20 },
  // Sprint 8 — new mission employers
  { sourceName: 'bank-assafa', companyName: 'Bank Assafa', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.bankassafa.com/fr/carrieres', priority: 68, estimatedMonthlyJobs: 25 },
  { sourceName: 'umnia-bank', companyName: 'Umnia Bank', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.umniabank.com/fr/carrieres', priority: 66, estimatedMonthlyJobs: 20 },
  { sourceName: 'bank-al-yousr', companyName: 'Bank Al Yousr', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.bankalyousr.ma/fr/carrieres', priority: 64, estimatedMonthlyJobs: 20 },
  { sourceName: 'oracle-morocco', companyName: 'Oracle Morocco', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://careers.oracle.com/en/sites/jobsearch/jobs?location=Morocco', priority: 62, estimatedMonthlyJobs: 40 },
  { sourceName: 'ibm-morocco', companyName: 'IBM Morocco', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://www.ibm.com/careers/search?field_keyword_08%5B0%5D=Morocco', priority: 62, estimatedMonthlyJobs: 35 },
  { sourceName: 'safran-maroc', companyName: 'Safran Maroc', category: 'automotive', sector: 'industry', status: 'active', careerPageUrl: 'https://jobs.safrangroup.com/', priority: 58, estimatedMonthlyJobs: 30 },
  { sourceName: 'lear-maroc', companyName: 'Lear Corporation Maroc', category: 'automotive', sector: 'industry', status: 'active', careerPageUrl: 'https://careers.lear.com/', priority: 55, estimatedMonthlyJobs: 25 },
  { sourceName: 'aptiv-maroc', companyName: 'Aptiv Maroc', category: 'automotive', sector: 'industry', status: 'active', careerPageUrl: 'https://aptiv.wd5.myworkdayjobs.com/APTIV_CAREERS', atsPlatform: 'workday', priority: 55, estimatedMonthlyJobs: 25 },
  { sourceName: 'yazaki-maroc', companyName: 'Yazaki Maroc', category: 'automotive', sector: 'industry', status: 'active', careerPageUrl: 'https://www.yazaki-group.com/global/careers/', priority: 52, estimatedMonthlyJobs: 20 },
  { sourceName: 'sumitomo-maroc', companyName: 'Sumitomo Electric Maroc', category: 'automotive', sector: 'industry', status: 'active', careerPageUrl: 'https://sumitomoelectric.com/careers/', priority: 50, estimatedMonthlyJobs: 20 },
  { sourceName: 'aramex-maroc', companyName: 'Aramex Maroc', category: 'technology', sector: 'logistics', status: 'active', careerPageUrl: 'https://www.aramex.com/ma/en/careers', priority: 55, estimatedMonthlyJobs: 25 },
  { sourceName: 'maersk-maroc', companyName: 'Maersk Maroc', category: 'technology', sector: 'logistics', status: 'active', careerPageUrl: 'https://jobs.maersk.com/', priority: 55, estimatedMonthlyJobs: 30 },
  { sourceName: 'bollore-maroc', companyName: 'Bolloré Logistics Maroc', category: 'technology', sector: 'logistics', status: 'active', careerPageUrl: 'https://www.bollore-logistics.com/en/careers/', priority: 52, estimatedMonthlyJobs: 25 },
  { sourceName: 'electroplanet', companyName: 'Electroplanet', category: 'retail', sector: 'retail', status: 'active', careerPageUrl: 'https://www.electroplanet.ma/carrieres', priority: 48, estimatedMonthlyJobs: 20 },
  { sourceName: 'marsa-maroc', companyName: 'Marsa Maroc', category: 'government', sector: 'government', status: 'active', careerPageUrl: 'https://www.marsamaroc.co.ma/fr/carrieres', priority: 58, estimatedMonthlyJobs: 25 },
];

export function getPlannedSources(): SourceCatalogEntry[] {
  return MOROCCO_SOURCE_CATALOG.filter((s) => s.status === 'planned');
}

export function getActiveSources(): SourceCatalogEntry[] {
  return MOROCCO_SOURCE_CATALOG.filter((s) => s.status === 'active');
}

/** Mission sector priority — drives expansion order. */
export const MISSION_SECTOR_ORDER = [
  'banks',
  'bpo',
  'telecom',
  'technology',
  'consulting',
  'industry',
  'automotive',
  'logistics',
  'retail',
  'hospitality',
  'aviation',
  'healthcare',
  'government',
] as const;

export function getSourcesBySector(sector: string): SourceCatalogEntry[] {
  return MOROCCO_SOURCE_CATALOG.filter((s) => s.sector === sector && s.sourceName !== 'linkedin');
}

export function getDiscoverySeeds(): string[] {
  const urls = new Set<string>();
  for (const sector of MISSION_SECTOR_ORDER) {
    for (const entry of getSourcesBySector(sector)) {
      if (entry.careerPageUrl) urls.add(entry.careerPageUrl);
      urls.add(guessEmployerHomepage(entry.companyName));
    }
  }
  return [...urls];
}

function guessEmployerHomepage(companyName: string): string {
  const slug = companyName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  return `https://www.${slug}.ma`;
}
