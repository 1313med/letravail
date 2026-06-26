import type { Job } from '../types/job.js';

export type ValidationStatus = 'valid' | 'flagged' | 'rejected';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface JobValidationResult {
  status: ValidationStatus;
  flags: string[];
  issues: ValidationIssue[];
  accepted: boolean;
}

const MIN_DESCRIPTION_LENGTH = 50;
const TITLE_ONLY_THRESHOLD = 1.1;

export function validateJob(job: Job): JobValidationResult {
  const issues: ValidationIssue[] = [];
  const flags: string[] = [];

  if (!job.title?.trim()) {
    issues.push({ code: 'EMPTY_TITLE', message: 'Missing job title', severity: 'error' });
    flags.push('empty_title');
  }

  if (!job.company?.trim() || job.company === 'Entreprise') {
    issues.push({ code: 'EMPTY_EMPLOYER', message: 'Missing or generic employer', severity: 'warning' });
    flags.push('empty_employer');
  }

  if (!job.applicationUrl?.trim()) {
    issues.push({ code: 'MISSING_URL', message: 'No application URL', severity: 'error' });
    flags.push('missing_url');
  }

  const descLen = job.description?.trim().length ?? 0;
  const titleLen = job.title?.trim().length ?? 0;

  if (descLen < MIN_DESCRIPTION_LENGTH) {
    issues.push({ code: 'SHORT_DESCRIPTION', message: `Description too short (${descLen} chars)`, severity: 'warning' });
    flags.push('short_description');
  }

  if (descLen > 0 && titleLen > 0 && descLen <= titleLen * TITLE_ONLY_THRESHOLD) {
    issues.push({ code: 'TITLE_ONLY', message: 'Description appears to be title-only', severity: 'warning' });
    flags.push('title_only');
  }

  if (job.rawHtml && /\uFFFD/.test(job.rawHtml)) {
    issues.push({ code: 'CORRUPTED_HTML', message: 'HTML encoding corruption detected', severity: 'warning' });
    flags.push('corrupted_html');
  }

  if (!job.city?.trim() || job.city.length < 2) {
    issues.push({ code: 'BROKEN_LOCATION', message: 'Invalid or missing location', severity: 'warning' });
    flags.push('broken_location');
  }

  if (job.publishedAt && job.publishedAt > new Date()) {
    issues.push({ code: 'FUTURE_DATE', message: 'Publication date in the future', severity: 'warning' });
    flags.push('invalid_date');
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const status: ValidationStatus = hasError ? 'rejected' : flags.length > 0 ? 'flagged' : 'valid';

  return {
    status,
    flags,
    issues,
    accepted: status !== 'rejected',
  };
}

export function validateJobBatch(jobs: Job[]): {
  accepted: Job[];
  rejected: Job[];
  flagged: Job[];
  report: { total: number; valid: number; flagged: number; rejected: number; flagCounts: Record<string, number> };
} {
  const accepted: Job[] = [];
  const rejected: Job[] = [];
  const flagged: Job[] = [];
  const flagCounts: Record<string, number> = {};

  for (const job of jobs) {
    const result = validateJob(job);
    const enriched = {
      ...job,
      validationStatus: result.status,
      validationFlags: result.flags,
      sourcePublishedAt: job.publishedAt ?? job.sourcePublishedAt,
    };

    for (const f of result.flags) {
      flagCounts[f] = (flagCounts[f] ?? 0) + 1;
    }

    if (!result.accepted) {
      rejected.push(enriched);
    } else if (result.status === 'flagged') {
      flagged.push(enriched);
      accepted.push(enriched);
    } else {
      accepted.push(enriched);
    }
  }

  return {
    accepted,
    rejected,
    flagged,
    report: {
      total: jobs.length,
      valid: accepted.length - flagged.length,
      flagged: flagged.length,
      rejected: rejected.length,
      flagCounts,
    },
  };
}
