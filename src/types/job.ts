export interface Job {
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  city: string;
  country: string;
  description: string;
  requirements?: string;
  salary?: string;
  contractType?: string;
  remote?: boolean;
  applicationUrl: string;
  publishedAt?: Date;
  expiresAt?: Date;
  tags: string[];
  rawHtml?: string;
  extractionMetadata?: Record<string, unknown>;
  experienceLevel?: string;
  experienceYears?: string;
  educationLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryNet?: boolean;
  qualityScore?: number;
  descriptionScore?: number;
  validationStatus?: string;
  validationFlags?: string[];
  sourcePublishedAt?: Date;
  crawlCount?: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  lastVerifiedAt?: Date;
  contentHash?: string;
}

export interface EnrichedJob extends Job {
  region?: string;
  canonicalCity?: string;
}

export interface ScrapeResult {
  source: string;
  jobs: Job[];
  jobsFound: number;
  durationMs: number;
  error?: string;
}

export interface PersistResult {
  inserted: number;
  updated: number;
  duplicates: number;
}

export interface ScrapeRunStats {
  source: string;
  category: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  jobsFound: number;
  jobsInserted: number;
  jobsUpdated: number;
  duplicates: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export interface JobSkillInput {
  name: string;
  slug: string;
  category?: string;
  confidence: number;
}

export interface CompanyEnrichmentInput {
  websiteUrl?: string;
  logoUrl?: string;
  industry?: string;
  sector?: string;
  size?: string;
  careerPageUrl?: string;
  linkedinUrl?: string;
  headquartersCity?: string;
  description?: string;
}
