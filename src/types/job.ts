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
