import type { Page } from 'playwright';
import type { Job } from '../../types/job.js';
import { BaseScraper } from '../base.scraper.js';
import { parseFrenchDate } from '../helpers.js';

const CAREERS_URL =
  'https://attijariwafabank.csod.com/ux/ats/careersite/4/home?c=attijariwafabank&lang=fr-FR';
const JOBS_API_URL = 'https://eu-cdg.api.csod.com/rec-job-search/external/jobs';
const JOB_DETAIL_BASE =
  'https://attijariwafabank.csod.com/ux/ats/careersite/4/home/requisition';
const PAGE_SIZE = 25;

const SEARCH_BODY = {
  careerSiteId: 4,
  careerSitePageId: 4,
  cultureId: 13,
  searchText: '',
  cultureName: 'fr-FR',
  states: [],
  countryCodes: [],
  cities: [],
  placeID: '',
  radius: null,
  postingsWithinDays: null,
  customFieldCheckboxKeys: [],
  customFieldDropdowns: [],
  customFieldRadios: [],
};

interface CsodLocation {
  country?: string;
  city?: string;
  state?: string;
  locationName?: string;
}

interface CsodRequisition {
  requisitionId: number;
  postingEffectiveDate?: string;
  postingExpirationDate?: string;
  displayJobTitle: string;
  locations?: CsodLocation[];
  externalDescription?: string;
}

interface CsodJobsResponse {
  status: string;
  data: {
    totalCount: number;
    requisitions: CsodRequisition[];
  };
}

export class AttijariwafaScraper extends BaseScraper {
  readonly sourceName = 'attijariwafa-bank';
  readonly category = 'banks' as const;
  readonly companyName = 'Attijariwafa Bank';

  async scrape(): Promise<Job[]> {
    return this.withPage(async (page) => {
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('rec-job-search/external/jobs') && res.status() === 200,
        { timeout: 30_000 },
      );

      await page.goto(CAREERS_URL, { waitUntil: 'domcontentloaded' });

      let requisitions = await this.parseInitialResponse(responsePromise);

      if (requisitions.length === 0) {
        requisitions = await this.fetchViaBrowser(page);
      }

      if (requisitions.length === 0) {
        requisitions = await this.parseDomFallback(page);
      }

      return requisitions.map((req) => this.toJob(req));
    });
  }

  private async parseInitialResponse(
    responsePromise: Promise<import('playwright').Response>,
  ): Promise<CsodRequisition[]> {
    try {
      const response = await responsePromise;
      const payload = (await response.json()) as CsodJobsResponse;
      return payload.data.requisitions ?? [];
    } catch {
      return [];
    }
  }

  private async fetchViaBrowser(page: Page): Promise<CsodRequisition[]> {
    const collected: CsodRequisition[] = [];
    let pageNumber = 1;
    let totalCount = 0;

    do {
      const payload = await page.evaluate(
        async ({ apiUrl, body, pageNumber: pageNum, pageSize }) => {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/json, text/plain, */*',
            },
            credentials: 'include',
            body: JSON.stringify({ ...body, pageNumber: pageNum, pageSize }),
          });

          if (!response.ok) {
            throw new Error(`CSOD API ${response.status}`);
          }

          return response.json();
        },
        { apiUrl: JOBS_API_URL, body: SEARCH_BODY, pageNumber, pageSize: PAGE_SIZE },
      );

      const data = payload as CsodJobsResponse;
      totalCount = data.data.totalCount;
      collected.push(...data.data.requisitions);
      pageNumber++;
    } while (collected.length < totalCount);

    return collected;
  }

  private async parseDomFallback(page: Page): Promise<CsodRequisition[]> {
    return page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.highlitedOffres-a, a[href*="/requisition/"]'));
      const seen = new Set<number>();

      return links.flatMap((link) => {
        const href = (link as HTMLAnchorElement).href;
        const title = link.textContent?.trim() ?? '';
        const match = href.match(/requisition\/(\d+)/);
        if (!title || !match) return [];

        const requisitionId = Number(match[1]);
        if (seen.has(requisitionId)) return [];
        seen.add(requisitionId);

        return [{
          requisitionId,
          displayJobTitle: title,
          externalDescription: title,
          locations: [{ country: 'MA' }],
        }];
      });
    });
  }

  private toJob(req: CsodRequisition): Job {
    const location = req.locations?.[0];
    const city = location?.city ?? location?.locationName ?? 'Casablanca';

    return this.normalize({
      sourceJobId: String(req.requisitionId),
      title: req.displayJobTitle,
      city,
      description: req.externalDescription ?? req.displayJobTitle,
      applicationUrl: `${JOB_DETAIL_BASE}/${req.requisitionId}?c=attijariwafabank&lang=fr-FR`,
      publishedAt: parseFrenchDate(req.postingEffectiveDate ?? ''),
      expiresAt: parseFrenchDate(req.postingExpirationDate ?? ''),
      tags: ['banks', 'finance', 'attijariwafa'],
    });
  }
}
