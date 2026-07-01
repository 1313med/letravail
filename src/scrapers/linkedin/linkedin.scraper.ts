import type { Page } from 'playwright';

import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import { config } from '../../config/index.js';

import { getPrisma } from '../../lib/prisma.js';

import { logger } from '../../lib/logger.js';

import { withRetry } from '../../lib/retry.js';

import type { Job } from '../../types/job.js';

import { normalizeCity } from '../../utils/cleaning.js';

import { isLikelyLinkedInJobTitle } from '../../utils/job-filters.js';

import {

  buildLinkedInMoroccoSearchUrl,

  buildLinkedInSearchUrl,

  getLinkedInCities,

  getLinkedInTimeFilter,

  LINKEDIN_JOBS_PER_PAGE,

} from './search.config.js';

import { closeLinkedInBrowser, getLinkedInContext, getLinkedInStoragePath } from './session.js';

import {

  fetchLinkedInJobDetail,

  fetchViaGuestApiDirect,

  summarizeLinkedInQuality,

  type LinkedInQualityMetrics,

} from './detail-fetcher.js';

import {

  type LinkedInEmployerHint,

  mergeEmployerHints,

  isValidEmployerName,

  parseLinkedInCompanyUrl,

} from './employer-hint.js';

import {

  fetchLinkedInCompanyProfile,

  companyProfileToHint,

} from './company-page-fetcher.js';



interface RawLinkedInJob {

  jobId: string;

  title: string;

  company: string;

  city: string;

  applicationUrl: string;

  description: string;

  requirements?: string;

  benefits?: string;

  rawHtml?: string;

  detailMethod?: string;

}



type SearchUrlBuilder = (start: number) => string;



const GUEST_CONCURRENCY = 5;

const MIN_RICH_DESCRIPTION = 200;



export class LinkedInScraper {

  readonly sourceName = 'linkedin';

  readonly category = 'linkedin' as const;



  private diagnosticResults: Array<{

    description: string;

    method: string;

    requirements?: string;

    benefits?: string;

  }> = [];

  private skippedCount = 0;

  private baselineAvgDescLen = 0;

  private employerHints: LinkedInEmployerHint[] = [];



  /** Hints collected during the last crawl — consumed by the discovery pipeline. */

  getLastEmployerHints(): LinkedInEmployerHint[] {

    return this.employerHints;

  }



  async run(): Promise<Job[]> {

    const startedAt = Date.now();

    this.diagnosticResults = [];

    this.skippedCount = 0;

    this.employerHints = [];

    this.baselineAvgDescLen = await this.loadDbBaseline();



    const authExists = existsSync(getLinkedInStoragePath());

    logger.info(

      {

        authExists,

        fast: process.env.LINKEDIN_FAST === 'true',

        cities: getLinkedInCities().length,

        timeFilter: getLinkedInTimeFilter() ?? 'all',

        maxPages: config.linkedinMaxPages,

        detailFetchAll: config.linkedinDetailFetchAll,

        headless: config.browserHeadless,

        baselineAvgDescLen: this.baselineAvgDescLen,

      },

      'LinkedIn scrape started',

    );



    if (!authExists) {

      logger.warn('LinkedIn auth missing — guest API will be used for descriptions');

    }



    try {

      const jobs = await withRetry(() => this.scrape(), this.sourceName);

      this.writeQualityReport();

      logger.info(

        { source: this.sourceName, jobsFound: jobs.length, durationMs: Date.now() - startedAt },

        'LinkedIn scrape completed',

      );

      return jobs;

    } finally {

      await closeLinkedInBrowser();

    }

  }



  private async loadDbBaseline(): Promise<number> {

    try {

      const db = getPrisma();

      const jobs = await db.job.findMany({

        where: { source: 'linkedin', isActive: true },

        select: { description: true },

        take: 500,

      });

      if (jobs.length === 0) return 0;

      return Math.round(jobs.reduce((a, j) => a + j.description.length, 0) / jobs.length);

    } catch {

      return 0;

    }

  }



  private async scrape(): Promise<Job[]> {

    const context = await getLinkedInContext();

    const page = await context.newPage();

    page.setDefaultTimeout(config.linkedinPageTimeoutMs);



    const collected = new Map<string, RawLinkedInJob>();



    try {

      const moroccoJobs = await this.scrapeSearch(page, buildLinkedInMoroccoSearchUrl, 'Morocco');

      for (const job of moroccoJobs) collected.set(job.jobId, job);



      const cities = getLinkedInCities();

      for (const city of cities) {

        if (collected.size >= config.linkedinMaxJobs) break;

        const cityJobs = await this.scrapeSearch(page, (start) => buildLinkedInSearchUrl(city, start), city);

        for (const job of cityJobs) {

          collected.set(job.jobId, job);

          if (collected.size >= config.linkedinMaxJobs) break;

        }

        await sleep(config.linkedinDelayMs);

      }



      let jobs = [...collected.values()];

      jobs = await this.enrichAllDescriptions(page, jobs);

      jobs = await this.discoverEmployersFromCrawl(page, jobs);



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



      const url = buildUrl(pageIndex * LINKEDIN_JOBS_PER_PAGE);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.linkedinPageTimeoutMs });

      await sleep(2_000);



      if (page.url().includes('/login') || page.url().includes('/authwall')) {

        throw new Error('LinkedIn redirected to login — run: npm run linkedin:login');

      }



      await this.scrollResults(page);

      const { kept } = await this.extractJobsFromPage(page, defaultCity);



      for (const job of kept) {

        collected.set(job.jobId, job);

        if (collected.size >= config.linkedinMaxJobs) break;

      }



      if (kept.length === 0) break;

      await sleep(config.linkedinDelayMs);

    }



    logger.info({ defaultCity, found: collected.size }, 'LinkedIn search done');

    return [...collected.values()];

  }



  private async extractJobsFromPage(page: Page, defaultCity: string) {

    const raw = await page.evaluate(() => {

      const results: Array<{

        jobId: string;

        title: string;

        company: string;

        city: string;

        applicationUrl: string;

        companyLinkedInUrl?: string;

      }> = [];

      const seen = new Set<string>();



      for (const anchor of Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'))) {

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

          )?.textContent?.trim() ?? anchor.textContent?.trim() ?? '';



        const companyLink = card?.querySelector('a[href*="/company/"]') as HTMLAnchorElement | null;

        const companyLinkedInUrl = companyLink?.href?.split('?')[0];



        const company =

          card?.querySelector(

            '.job-search-card__subtitle-link, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle',

          )?.textContent?.trim() ?? 'Entreprise';



        const city =

          card?.querySelector(

            '.job-search-card__location, .job-search-card__metadata-item, .job-card-container__metadata-item',

          )?.textContent?.trim() ?? '';



        if (title.length < 4) continue;



        results.push({

          jobId,

          title,

          company,

          city,

          applicationUrl: href.split('?')[0]!,

          companyLinkedInUrl,

        });

      }

      return results;

    });



    const kept = raw

      .filter((j) => isLikelyLinkedInJobTitle(j.title))

      .map((j) => {

        if (isValidEmployerName(j.company)) {

          this.employerHints.push({

            companyName: j.company,

            linkedinUrl: j.companyLinkedInUrl,

            linkedinSlug: j.companyLinkedInUrl

              ? parseLinkedInCompanyUrl(j.companyLinkedInUrl)?.slug

              : undefined,

            location: j.city || defaultCity,

            hiringStatus: 'actively_hiring',

            discoverySource: 'job_search',

            jobIds: [j.jobId],

          });

        }

        return {

          jobId: j.jobId,

          title: j.title,

          company: j.company,

          city: j.city || defaultCity,

          applicationUrl: j.applicationUrl,

          description: j.title,

        };

      });



    return { raw: raw.length, kept };

  }



  private async enrichAllDescriptions(page: Page, jobs: RawLinkedInJob[]): Promise<RawLinkedInJob[]> {

    const limit = config.linkedinDetailFetchAll

      ? jobs.length

      : Math.min(jobs.length, config.linkedinDetailFetchLimit);



    logger.info({ total: jobs.length, fetching: limit }, 'Fetching LinkedIn job descriptions');



    const toFetch = jobs.slice(0, limit);

    const skipped = jobs.slice(limit);

    this.skippedCount = skipped.length;



    const enrichedMap = new Map<string, RawLinkedInJob>();



    for (let i = 0; i < toFetch.length; i += GUEST_CONCURRENCY) {

      const batch = toFetch.slice(i, i + GUEST_CONCURRENCY);

      const results = await Promise.all(

        batch.map(async (job) => {

          const guest = await fetchViaGuestApiDirect(job.jobId);

          if (guest.description.length >= MIN_RICH_DESCRIPTION) {

            return { job, detail: guest };

          }

          const detail = await fetchLinkedInJobDetail(page, job.jobId);

          return { job, detail };

        }),

      );



      for (const { job, detail } of results) {

        this.diagnosticResults.push({

          description: detail.description,

          method: detail.method,

          requirements: detail.requirements,

          benefits: detail.benefits,

        });



        enrichedMap.set(job.jobId, {

          ...job,

          title: detail.title || job.title,

          company: detail.company || job.company,

          city: detail.city || job.city,

          description: detail.description.length > job.description.length ? detail.description : job.description,

          requirements: detail.requirements,

          benefits: detail.benefits,

          rawHtml: detail.rawHtml,

          detailMethod: detail.method,

        });



        if (isValidEmployerName(detail.company || job.company)) {

          this.employerHints.push({

            companyName: detail.company || job.company,

            linkedinUrl: detail.companyLinkedInUrl,

            linkedinSlug: detail.companyLinkedInSlug,

            location: detail.city || job.city,

            hiringStatus: 'actively_hiring',

            discoverySource: 'job_detail',

            jobIds: [job.jobId],

          });

        }

      }



      if (i % 20 === 0) {

        logger.info({ progress: Math.min(i + GUEST_CONCURRENCY, limit), total: limit }, 'LinkedIn detail fetch progress');

      }

      await sleep(300);

    }



    const stats = summarizeLinkedInQuality(this.diagnosticResults, this.skippedCount);

    logger.info({ ...stats }, 'LinkedIn detail fetch summary');



    return [

      ...toFetch.map((j) => enrichedMap.get(j.jobId) ?? j),

      ...skipped,

    ];

  }



  /** Enrich employer hints with company page metadata for slugs we have not seen. */

  private async discoverEmployersFromCrawl(

    page: Page,

    jobs: RawLinkedInJob[],

  ): Promise<RawLinkedInJob[]> {

    this.employerHints = mergeEmployerHints(this.employerHints);



    const slugsToFetch = new Set<string>();

    for (const hint of this.employerHints) {

      if (hint.linkedinSlug) slugsToFetch.add(hint.linkedinSlug);

    }



    const maxProfiles = Number(process.env.LINKEDIN_COMPANY_FETCH_LIMIT ?? 25);

    const slugs = [...slugsToFetch].slice(0, maxProfiles);



    logger.info(

      { uniqueEmployers: this.employerHints.length, companyPagesToFetch: slugs.length },

      'LinkedIn employer discovery — fetching company profiles',

    );



    for (const slug of slugs) {

      const profile = await fetchLinkedInCompanyProfile(slug);

      if (profile) {

        this.employerHints.push(companyProfileToHint(profile));

      }

      await sleep(400);

    }



    const related = await this.extractRelatedCompanies(page);

    this.employerHints.push(...related);



    this.employerHints = mergeEmployerHints(this.employerHints);



    logger.info(

      { totalEmployerHints: this.employerHints.length, jobsScraped: jobs.length },

      'LinkedIn employer discovery complete',

    );



    return jobs;

  }



  private async extractRelatedCompanies(page: Page): Promise<LinkedInEmployerHint[]> {

    const hints: LinkedInEmployerHint[] = [];

    try {

      const related = await page.evaluate(() => {

        const out: Array<{ name: string; url: string }> = [];

        for (const anchor of Array.from(document.querySelectorAll('a[href*="/company/"]'))) {

          const el = anchor as HTMLAnchorElement;

          const href = el.href?.split('?')[0];

          const name = el.textContent?.trim() ?? '';

          if (!href || name.length < 2 || name.length > 100) continue;

          if (/voir|see|linkedin|emploi|job/i.test(name)) continue;

          out.push({ name, url: href });

        }

        return out;

      });



      for (const { name, url } of related) {

        if (!isValidEmployerName(name)) continue;

        hints.push({

          companyName: name,

          linkedinUrl: url,

          linkedinSlug: parseLinkedInCompanyUrl(url)?.slug,

          discoverySource: 'related_company',

          hiringStatus: 'unknown',

        });

      }

    } catch {

      /* non-fatal */

    }

    return hints;

  }



  private writeQualityReport(): void {

    const stats = summarizeLinkedInQuality(this.diagnosticResults, this.skippedCount);

    const reportDir = join(process.cwd(), 'reports');

    mkdirSync(reportDir, { recursive: true });



    const improvement =

      this.baselineAvgDescLen > 0

        ? Math.round(((stats.avgDescriptionLength - this.baselineAvgDescLen) / this.baselineAvgDescLen) * 100)

        : null;



    const lines = [

      '# LinkedIn Quality Report',

      `Generated: ${new Date().toISOString()}`,

      '',

      '## Summary',

      `- Jobs processed: ${stats.total}`,

      `- Detail success rate: ${(stats.detailSuccessRate * 100).toFixed(1)}%`,

      `- Avg description length: **${stats.avgDescriptionLength}** chars (baseline: ${this.baselineAvgDescLen})`,

      improvement !== null ? `- Improvement vs previous crawl: **${improvement > 0 ? '+' : ''}${improvement}%**` : '',

      `- Title-only remaining: ${stats.titleOnly}`,

      `- Skipped (over limit): ${stats.skipped}`,

      '',

      '## Extraction Method',

      `- Guest API success (≥200 chars): ${stats.guestApiSuccess}`,

      `- Playwright fallback success: ${stats.playwrightSuccess}`,

      `- Failed / short descriptions: ${stats.failed}`,

      '',

      '## Structured Coverage',

      `- With requirements section: ${stats.withRequirements}`,

      `- With benefits section: ${stats.withBenefits}`,

      '',

      '## Auth Status',

      `- Session file exists: ${existsSync(getLinkedInStoragePath())}`,

      '',

    ].filter(Boolean);



    writeFileSync(join(reportDir, 'linkedin-quality-report.md'), lines.join('\n'), 'utf-8');



    const historyPath = join(reportDir, 'linkedin-quality-history.json');

    let history: Array<LinkedInQualityMetrics & { at: string; baselineAvgDescLen: number }> = [];

    try {

      history = JSON.parse(readFileSync(historyPath, 'utf-8'));

    } catch {

      /* first run */

    }

    history.push({ ...stats, at: new Date().toISOString(), baselineAvgDescLen: this.baselineAvgDescLen });

    writeFileSync(historyPath, JSON.stringify(history.slice(-50), null, 2), 'utf-8');

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

      requirements: raw.requirements,

      applicationUrl: raw.applicationUrl,

      rawHtml: raw.rawHtml,

      tags: ['linkedin', 'morocco', city.toLowerCase().replace(/\s+/g, '-')],

    };

  }

}



function sleep(ms: number): Promise<void> {

  return new Promise((resolve) => setTimeout(resolve, ms));

}


