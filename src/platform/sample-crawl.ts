/**
 * Sample crawl — dry-run scraper for activation validation (no DB persist).
 */
import type { Job } from '../types/job.js';
import type { ScrapeService } from '../services/scrape.service.js';
import { logger } from '../lib/logger.js';

export interface SampleCrawlResult {
  sourceName: string;
  jobs: Job[];
  jobsFound: number;
  durationMs: number;
  error?: string;
  endpointWorked: boolean;
}

export async function runSampleCrawl(
  scrapeService: ScrapeService,
  sourceName: string,
): Promise<SampleCrawlResult> {
  const started = Date.now();
  try {
    const jobs = await scrapeService.collectJobs(sourceName);
    return {
      sourceName,
      jobs,
      jobsFound: jobs.length,
      durationMs: Date.now() - started,
      endpointWorked: jobs.length > 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ source: sourceName, err: message }, 'Sample crawl failed');
    return {
      sourceName,
      jobs: [],
      jobsFound: 0,
      durationMs: Date.now() - started,
      error: message,
      endpointWorked: false,
    };
  }
}

export async function testApiEndpoint(url: string): Promise<boolean> {
  if (!url.startsWith('http')) return false;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.length > 50 && !text.startsWith('<!DOCTYPE');
  } catch {
    return false;
  }
}
