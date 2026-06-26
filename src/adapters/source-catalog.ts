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
  { sourceName: 'bmci', companyName: 'BMCI', category: 'banks', sector: 'banks', status: 'active', priority: 70, estimatedMonthlyJobs: 30 },
  { sourceName: 'bank-of-africa', companyName: 'Bank of Africa', category: 'banks', sector: 'banks', status: 'active', priority: 70, estimatedMonthlyJobs: 40 },
  { sourceName: 'dxc-technology', companyName: 'DXC Technology', category: 'technology', sector: 'technology', status: 'active', careerPageUrl: 'https://careers.dxc.com', priority: 65, estimatedMonthlyJobs: 20 },
  { sourceName: 'capgemini', companyName: 'Capgemini', category: 'technology', sector: 'technology', status: 'active', priority: 60, estimatedMonthlyJobs: 80 },
  { sourceName: 'cgi', companyName: 'CGI', category: 'technology', sector: 'technology', status: 'active', priority: 60, estimatedMonthlyJobs: 60 },
  { sourceName: 'inwi', companyName: 'Inwi', category: 'telecom', sector: 'telecom', status: 'active', priority: 55, estimatedMonthlyJobs: 40 },
  { sourceName: 'maroc-telecom', companyName: 'Maroc Telecom', category: 'telecom', sector: 'telecom', status: 'active', priority: 55, estimatedMonthlyJobs: 50 },
  { sourceName: 'orange-maroc', companyName: 'Orange Maroc', category: 'telecom', sector: 'telecom', status: 'active', priority: 55, estimatedMonthlyJobs: 35 },
  { sourceName: 'anapec', companyName: 'ANAPEC', category: 'government', sector: 'government', status: 'active', priority: 75, estimatedMonthlyJobs: 500 },
  { sourceName: 'royal-air-maroc', companyName: 'Royal Air Maroc', category: 'airlines', sector: 'aviation', status: 'active', priority: 50, estimatedMonthlyJobs: 30 },
  { sourceName: 'renault-maroc', companyName: 'Renault Maroc', category: 'automotive', sector: 'automotive', status: 'active', priority: 50, estimatedMonthlyJobs: 25 },
  { sourceName: 'stellantis', companyName: 'Stellantis', category: 'automotive', sector: 'automotive', status: 'active', priority: 50, estimatedMonthlyJobs: 20 },
  { sourceName: 'marjane', companyName: 'Marjane', category: 'retail', sector: 'retail', status: 'active', priority: 45, estimatedMonthlyJobs: 40 },
  { sourceName: 'labelvie', companyName: 'LabelVie', category: 'retail', sector: 'retail', status: 'active', priority: 45, estimatedMonthlyJobs: 30 },
  // Planned — Banks (Sprint 3 active)
  { sourceName: 'banque-populaire', companyName: 'Banque Populaire', category: 'banks', sector: 'banks', status: 'active', careerPageUrl: 'https://www.groupebcp.ma/fr/carrieres', atsPlatform: 'workday', priority: 88, estimatedMonthlyJobs: 100 },
  { sourceName: 'credit-du-maroc', companyName: 'Crédit du Maroc', category: 'banks', sector: 'banks', status: 'active', priority: 82, estimatedMonthlyJobs: 60 },
  { sourceName: 'credit-agricole-maroc', companyName: 'Crédit Agricole du Maroc', category: 'banks', sector: 'banks', status: 'active', priority: 80, estimatedMonthlyJobs: 50 },
  { sourceName: 'societe-generale-maroc', companyName: 'Société Générale Maroc', category: 'banks', sector: 'banks', status: 'active', priority: 78, estimatedMonthlyJobs: 40 },
  { sourceName: 'cfg-bank', companyName: 'CFG Bank', category: 'banks', sector: 'banks', status: 'active', priority: 72, estimatedMonthlyJobs: 30 },
  { sourceName: 'al-barid-bank', companyName: 'Al Barid Bank', category: 'banks', sector: 'banks', status: 'active', priority: 70, estimatedMonthlyJobs: 35 },
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
  { sourceName: 'inetum-maroc', companyName: 'Inetum Maroc', category: 'technology', sector: 'technology', status: 'planned', priority: 60, estimatedMonthlyJobs: 40 },
  { sourceName: 'sqli-maroc', companyName: 'SQLI Maroc', category: 'technology', sector: 'technology', status: 'planned', priority: 58, estimatedMonthlyJobs: 35 },
  { sourceName: 'devoteam-maroc', companyName: 'Devoteam Maroc', category: 'technology', sector: 'technology', status: 'planned', priority: 58, estimatedMonthlyJobs: 30 },
  // Planned — BPO / Call Centers (high priority)
  { sourceName: 'intelcia', companyName: 'Intelcia', category: 'technology', sector: 'bpo', status: 'active', careerPageUrl: 'https://www.intelcia.com/fr/nous-rejoindre/', priority: 90, estimatedMonthlyJobs: 200 },
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
  { sourceName: 'air-arabia-maroc', companyName: 'Air Arabia Maroc', category: 'airlines', sector: 'aviation', status: 'planned', priority: 50, estimatedMonthlyJobs: 20 },
];

export function getPlannedSources(): SourceCatalogEntry[] {
  return MOROCCO_SOURCE_CATALOG.filter((s) => s.status === 'planned');
}

export function getActiveSources(): SourceCatalogEntry[] {
  return MOROCCO_SOURCE_CATALOG.filter((s) => s.status === 'active');
}
