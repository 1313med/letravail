import type { Job } from '../types/job.js';
import { enrichJobs, type EnrichmentResult } from '../enrichment/job-enrichment.service.js';

export function enrichAndPrepare(jobs: Job[]): EnrichmentResult[] {
  return enrichJobs(jobs);
}
