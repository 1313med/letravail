import type { ScrapeCategory } from '../config/index.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import type { Job } from '../types/job.js';
import type { BaseScraper } from '../scrapers/base.scraper.js';
import { rankJobsByFreshness } from '../platform/job-ranker.js';

/** Source Intelligence Score dimensions (0-100 each) */
export interface SourceIntelligenceProfile {
  sourceName: string;
  category: ScrapeCategory;
  companyName: string;
  /** Composite score for prioritization */
  intelligenceScore: number;
  descriptionRichness: number;
  freshness: number;
  antiBotComplexity: number;
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  estimatedMonthlyJobs: number;
  status: 'active' | 'planned' | 'broken';
  careerPageUrl?: string;
  notes?: string;
}

export interface SourceAdapter {
  readonly profile: SourceIntelligenceProfile;
  createScraper(pagePool: PagePool): BaseScraper;
}

export const SOURCE_INTELLIGENCE_REGISTRY: SourceIntelligenceProfile[] = [
  { sourceName: 'cih-bank', category: 'banks', companyName: 'CIH Bank', intelligenceScore: 92, descriptionRichness: 95, freshness: 85, antiBotComplexity: 30, updateFrequency: 'daily', estimatedMonthlyJobs: 400, status: 'active', careerPageUrl: 'https://recrutement.cihbank.ma' },
  { sourceName: 'attijariwafa-bank', category: 'banks', companyName: 'Attijariwafa Bank', intelligenceScore: 88, descriptionRichness: 90, freshness: 80, antiBotComplexity: 40, updateFrequency: 'daily', estimatedMonthlyJobs: 50, status: 'active' },
  { sourceName: 'linkedin', category: 'linkedin', companyName: 'LinkedIn', intelligenceScore: 85, descriptionRichness: 90, freshness: 95, antiBotComplexity: 75, updateFrequency: 'hourly', estimatedMonthlyJobs: 2000, status: 'active', notes: 'Requires auth + guest API fallback' },
  { sourceName: 'bmci', category: 'banks', companyName: 'BMCI', intelligenceScore: 70, descriptionRichness: 60, freshness: 70, antiBotComplexity: 50, updateFrequency: 'weekly', estimatedMonthlyJobs: 30, status: 'active' },
  { sourceName: 'bank-of-africa', category: 'banks', companyName: 'Bank of Africa', intelligenceScore: 65, descriptionRichness: 55, freshness: 65, antiBotComplexity: 45, updateFrequency: 'weekly', estimatedMonthlyJobs: 40, status: 'active' },
  { sourceName: 'dxc-technology', category: 'technology', companyName: 'DXC Technology', intelligenceScore: 60, descriptionRichness: 50, freshness: 60, antiBotComplexity: 60, updateFrequency: 'weekly', estimatedMonthlyJobs: 20, status: 'active' },
  { sourceName: 'capgemini', category: 'technology', companyName: 'Capgemini', intelligenceScore: 72, descriptionRichness: 65, freshness: 70, antiBotComplexity: 55, updateFrequency: 'weekly', estimatedMonthlyJobs: 80, status: 'active' },
  { sourceName: 'cgi', category: 'technology', companyName: 'CGI', intelligenceScore: 70, descriptionRichness: 60, freshness: 65, antiBotComplexity: 55, updateFrequency: 'weekly', estimatedMonthlyJobs: 60, status: 'active' },
  { sourceName: 'inwi', category: 'telecom', companyName: 'Inwi', intelligenceScore: 68, descriptionRichness: 55, freshness: 70, antiBotComplexity: 50, updateFrequency: 'weekly', estimatedMonthlyJobs: 40, status: 'active' },
  { sourceName: 'maroc-telecom', category: 'telecom', companyName: 'Maroc Telecom', intelligenceScore: 68, descriptionRichness: 55, freshness: 70, antiBotComplexity: 50, updateFrequency: 'weekly', estimatedMonthlyJobs: 50, status: 'active' },
  { sourceName: 'orange-maroc', category: 'telecom', companyName: 'Orange Maroc', intelligenceScore: 65, descriptionRichness: 50, freshness: 65, antiBotComplexity: 50, updateFrequency: 'weekly', estimatedMonthlyJobs: 35, status: 'active' },
  { sourceName: 'anapec', category: 'government', companyName: 'ANAPEC', intelligenceScore: 75, descriptionRichness: 70, freshness: 80, antiBotComplexity: 35, updateFrequency: 'daily', estimatedMonthlyJobs: 500, status: 'active' },
  // Planned sources
  { sourceName: 'banque-populaire', category: 'banks', companyName: 'Banque Populaire', intelligenceScore: 80, descriptionRichness: 70, freshness: 75, antiBotComplexity: 45, updateFrequency: 'weekly', estimatedMonthlyJobs: 100, status: 'planned', careerPageUrl: 'https://www.groupebcp.ma/carrieres' },
  { sourceName: 'credit-du-maroc', category: 'banks', companyName: 'Crédit du Maroc', intelligenceScore: 75, descriptionRichness: 65, freshness: 70, antiBotComplexity: 45, updateFrequency: 'weekly', estimatedMonthlyJobs: 60, status: 'planned' },
  { sourceName: 'ocp-group', category: 'automotive', companyName: 'OCP Group', intelligenceScore: 78, descriptionRichness: 70, freshness: 75, antiBotComplexity: 50, updateFrequency: 'weekly', estimatedMonthlyJobs: 120, status: 'planned' },
  { sourceName: 'accenture-maroc', category: 'technology', companyName: 'Accenture Maroc', intelligenceScore: 76, descriptionRichness: 75, freshness: 80, antiBotComplexity: 60, updateFrequency: 'weekly', estimatedMonthlyJobs: 90, status: 'planned' },
  { sourceName: 'deloitte-maroc', category: 'technology', companyName: 'Deloitte Maroc', intelligenceScore: 74, descriptionRichness: 70, freshness: 75, antiBotComplexity: 60, updateFrequency: 'weekly', estimatedMonthlyJobs: 70, status: 'planned' },
  { sourceName: 'decathlon-maroc', category: 'retail', companyName: 'Decathlon Maroc', intelligenceScore: 70, descriptionRichness: 65, freshness: 70, antiBotComplexity: 40, updateFrequency: 'weekly', estimatedMonthlyJobs: 40, status: 'planned' },
  { sourceName: 'ikea-maroc', category: 'retail', companyName: 'IKEA Maroc', intelligenceScore: 68, descriptionRichness: 60, freshness: 65, antiBotComplexity: 45, updateFrequency: 'weekly', estimatedMonthlyJobs: 25, status: 'planned' },
];

export function getSourceProfile(sourceName: string): SourceIntelligenceProfile | undefined {
  return SOURCE_INTELLIGENCE_REGISTRY.find((s) => s.sourceName === sourceName);
}

export function sortJobsByFreshness(jobs: Job[]): Job[] {
  return rankJobsByFreshness(jobs);
}
