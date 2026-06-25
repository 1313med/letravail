import type { Page } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import type { Job } from '../../types/job.js';
import { normalizeCity } from '../../utils/cleaning.js';
import { isLikelyLinkedInJobTitle } from '../../utils/job-filters.js';
import {
  buildLinkedInJobUrl,
  buildLinkedInMoroccoSearchUrl,
  buildLinkedInSearchUrl,
  getLinkedInCities,
  getLinkedInTimeFilter,
  LINKEDIN_JOBS_PER_PAGE,
} from './search.config.js';
import { closeLinkedInBrowser, getLinkedInContext } from './session.js';

interface RawLinkedInJob {
  jobId: string;
  title: string;
  company: string;
  city: string;
  applicationUrl: string;
  description: string;
  rawHtml?: string;
}

type SearchUrlBuilder = (start: number) => string;

export class LinkedInScraper {
  readonly sourceName = 'linkedin';
  readonly category = 'linkedin' as const;

  async run(): Promise<Job[]> {
    const startedAt = Date.now();
    logger.info(
      {
        fast: process.env.LINKEDIN_FAST === 'true',
        cities: getLinkedInCities().length,
        timeFilter: getLinkedInTimeFilter() ?? 'all',
        maxPages: config.linkedinMaxPages,
        headless: config.browserHeadless,
      },
      'LinkedIn scrape started',
    );

    try {
      const jobs = await withRetry(() => this.scrape(), this.sourceName);
      logger.info(
        { source: this.sourceName, jobsFound: jobs.length, durationMs: Date.now() - startedAt },
        'LinkedIn scrape completed',
      );
      return jobs;
    } finally {
      await closeLinkedInBrowser();
    }
  }

  private async scrape(): Promise<Job[]> {
    const context = await getLinkedInContext();
    const page = await context.newPage();
    page.setDefaultTimeout(config.linkedinPageTimeoutMs);

    const collected = new Map<string, RawLinkedInJob>();

    try {
      const moroccoJobs = await this.scrapeSearch(
        page,
        buildLinkedInMoroccoSearchUrl,
        'Morocco',
      );
      for (const job of moroccoJobs) {
        collected.set(job.jobId, job);
      }
      logger.info({ found: moroccoJobs.length, total: collected.size }, 'LinkedIn Morocco search done');

      const cities = getLinkedInCities();
      logger.info({ cities: cities.length }, 'LinkedIn city searches');

      for (const city of cities) {
        if (collected.size >= config.linkedinMaxJobs) break;

        const cityJobs = await this.scrapeSearch(
          page,
          (start) => buildLinkedInSearchUrl(city, start),
          city,
        );
        for (const job of cityJobs) {
          collected.set(job.jobId, job);
          if (collected.size >= config.linkedinMaxJobs) break;
        }

        logger.info({ city, found: cityJobs.length, total: collected.size }, 'LinkedIn city done');
        await sleep(config.linkedinDelayMs);
      }

      let jobs = [...collected.values()];

      if (config.linkedinDetailFetchLimit > 0) {
        logger.info(
          { listings: jobs.length, limit: config.linkedinDetailFetchLimit },
          'Fetching job descriptions (optional — slow)',
        );
        jobs = await this.enrichDescriptions(page, jobs);
      }

      return jobs.map((raw) => this.toJob(raw));
    } finally {
      await page.close();
    }
  }

  private async scrapeSearch(
    page: Page,
    buildUrl: SearchUrlBuilder,
    defaultCity: string,
  ): Promise<RawLinkedInJob[]> {
    const collected = new Map<string, RawLinkedInJob>();

    for (let pageIndex = 0; pageIndex < config.linkedinMaxPages; pageIndex++) {
      if (collected.size >= config.linkedinMaxJobs) break;

      const start = pageIndex * LINKEDIN_JOBS_PER_PAGE;
      const url = buildUrl(start);

      logger.info({ defaultCity, page: pageIndex + 1, start }, 'Searching LinkedIn jobs');

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.linkedinPageTimeoutMs });
      await sleep(2_000);

      if (page.url().includes('/login') || page.url().includes('/authwall')) {
        throw new Error('LinkedIn redirected to login — run: npm run linkedin:login');
      }

      await this.scrollResults(page);

      const { raw, kept } = await this.extractJobsFromPage(page, defaultCity);
      const before = collected.size;

      for (const job of kept) {
        collected.set(job.jobId, job);
        if (collected.size >= config.linkedinMaxJobs) break;
      }

      logger.info(
        {
          defaultCity,
          page: pageIndex + 1,
          anchors: raw,
          kept: kept.length,
          newJobs: collected.size - before,
          total: collected.size,
        },
        'LinkedIn search page done',
      );

      if (kept.length === 0 || collected.size - before === 0) break;
      if (kept.length < LINKEDIN_JOBS_PER_PAGE) break;

      await sleep(config.linkedinDelayMs);
    }

    return [...collected.values()];
  }

  private async extractJobsFromPage(
    page: Page,
    defaultCity: string,
  ): Promise<{ raw: number; kept: RawLinkedInJob[] }> {
    const raw = await page.evaluate(() => {
      const results: Array<{
        jobId: string;
        title: string;
        company: string;
        city: string;
        applicationUrl: string;
      }> = [];
      const seen = new Set<string>();

      const anchors = Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'));
      for (const anchor of anchors) {
        const href = (anchor as HTMLAnchorElement).href;
        const match = href.match(/jobs\/view\/(\d+)/);
        if (!match) continue;

        const jobId = match[1]!;
        if (seen.has(jobId)) continue;
        seen.add(jobId);

        const card =
          anchor.closest(
            'li, .job-search-card, .base-card, .jobs-search-results__list-item, div[data-job-id]',
          ) ?? anchor.parentElement;

        const title =
          card?.querySelector(
            '.job-search-card__title, .base-search-card__title, .job-card-list__title, strong, h3',
          )?.textContent?.trim() ??
          anchor.textContent?.trim() ??
          '';

        const company =
          card?.querySelector(
            '.job-search-card__subtitle-link, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle, .job-card-container__company-name',
          )?.textContent?.trim() ?? 'Entreprise';

        const location =
          card?.querySelector(
            '.job-search-card__location, .job-search-card__metadata-item, .job-card-container__metadata-item',
          )?.textContent?.trim() ?? '';

        if (!title || title.length < 4) continue;

        results.push({
          jobId,
          title,
          company,
          city: location,
          applicationUrl: href.split('?')[0]!,
        });
      }

      return results;
    });

    const kept = raw
      .filter((j) => isLikelyLinkedInJobTitle(j.title))
      .map((j) => ({
        jobId: j.jobId,
        title: j.title,
        company: j.company,
        city: j.city || defaultCity,
        applicationUrl: j.applicationUrl,
        description: j.title,
      }));

    return { raw: raw.length, kept };
  }

  private async scrollResults(page: Page): Promise<void> {
    for (let i = 0; i < config.linkedinScrollRounds; i++) {
      await page.evaluate(() => {
        const list = document.querySelector(
          '.jobs-search-results-list, .scaffold-layout__list-container, .jobs-search-results__list',
        );
        if (list) list.scrollTop = list.scrollHeight;
        else window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(1_200);
    }
  }

  private async enrichDescriptions(page: Page, jobs: RawLinkedInJob[]): Promise<RawLinkedInJob[]> {
    const limit = Math.min(jobs.length, config.linkedinDetailFetchLimit);
    const enriched: RawLinkedInJob[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]!;
      if (i < limit) {
        try {
          const detail = await this.fetchJobDetail(page, job.jobId);
          enriched.push({ ...job, ...detail, description: detail.description || job.title });
          await sleep(config.linkedinDelayMs);
        } catch {
          enriched.push(job);
        }
      } else {
        enriched.push(job);
      }
    }

    return enriched;
  }

  private async fetchJobDetail(
    page: Page,
    jobId: string,
  ): Promise<Pick<RawLinkedInJob, 'title' | 'company' | 'city' | 'description' | 'rawHtml'>> {
    await page.goto(buildLinkedInJobUrl(jobId), {
      waitUntil: 'domcontentloaded',
      timeout: config.linkedinPageTimeoutMs,
    });
    await sleep(1_000);

    return page.evaluate(() => {
      const title =
        document.querySelector(
          '.job-details-jobs-unified-top-card__job-title, .top-card-layout__title, h1',
        )?.textContent?.trim() ?? '';

      const company =
        document.querySelector(
          '.job-details-jobs-unified-top-card__company-name a, .topcard__org-name-link',
        )?.textContent?.trim() ?? '';

      const city =
        document.querySelector(
          '.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet',
        )?.textContent?.trim() ?? '';

      const description =
        document.querySelector(
          '.jobs-description__content, .jobs-box__html-content, #job-details',
        )?.textContent?.trim() ?? '';

      const rawHtml =
        document.querySelector(
          '.jobs-description__content, .jobs-box__html-content, #job-details',
        )?.innerHTML ?? '';

      return { title, company, city, description, rawHtml };
    });
  }

  private toJob(raw: RawLinkedInJob): Job {
    const city = normalizeCity(raw.city || 'Casablanca');
    return {
      source: this.sourceName,
      sourceJobId: raw.jobId,
      title: raw.title,
      company: raw.company,
      city,
      country: 'Morocco',
      description: raw.description || raw.title,
      applicationUrl: raw.applicationUrl,
      rawHtml: raw.rawHtml,
      tags: ['linkedin', 'morocco', city.toLowerCase().replace(/\s+/g, '-')],
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
