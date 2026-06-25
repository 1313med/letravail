import { createHash } from 'node:crypto';
import type { Job } from '../types/job.js';

export function generateJobHash(
  job: Pick<Job, 'source' | 'sourceJobId' | 'title' | 'company' | 'city'>,
): string {
  const payload = `${job.source}|${job.sourceJobId}|${job.title}|${job.company}|${job.city}`;
  return createHash('sha256').update(payload).digest('hex');
}
