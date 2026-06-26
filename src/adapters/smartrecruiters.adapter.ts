/**
 * SmartRecruiters public API adapter.
 * https://developers.smartrecruiters.com/docs/endpoints
 */
import type { Job } from '../types/job.js';
import { cleanText, stripHtml } from '../utils/cleaning.js';
import { logger } from '../lib/logger.js';

export interface SmartRecruitersConfig {
  sourceName: string;
  companyName: string;
  companyId: string;
  tags: string[];
  defaultCity?: string;
  countryCode?: string;
}

interface SrPosting {
  id: string;
  name: string;
  releasedDate: string;
  location: { city?: string; country?: string; region?: string };
  applyUrl: string;
}

export async function fetchSmartRecruitersJobs(config: SmartRecruitersConfig): Promise<Job[]> {
  const jobs: Job[] = [];
  let offset = 0;
  const limit = 100;

  try {
    while (offset < 500) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (config.countryCode) params.set('country', config.countryCode);

      const res = await fetch(
        `https://api.smartrecruiters.com/v1/companies/${config.companyId}/postings?${params}`,
        { headers: { Accept: 'application/json', 'User-Agent': 'LetravailScraper/1.0' } },
      );

      if (!res.ok) {
        logger.warn({ source: config.sourceName, status: res.status }, 'SmartRecruiters API failed');
        break;
      }

      const data = (await res.json()) as { content: SrPosting[]; totalFound: number };
      const postings = data.content ?? [];
      if (postings.length === 0) break;

      for (const p of postings) {
        const detail = await fetchSrDetail(config.companyId, p.id);
        const location = [p.location?.city, p.location?.country].filter(Boolean).join(', ');
        jobs.push({
          source: config.sourceName,
          sourceJobId: p.id,
          title: p.name,
          company: config.companyName,
          city: p.location?.city || config.defaultCity || 'Casablanca',
          country: 'Morocco',
          description: detail || p.name,
          applicationUrl: p.applyUrl,
          rawHtml: detail,
          publishedAt: p.releasedDate ? new Date(p.releasedDate) : undefined,
          tags: config.tags,
        });
        void location;
      }

      offset += limit;
      if (offset >= (data.totalFound ?? 0)) break;
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'SmartRecruiters jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'SmartRecruiters fetch error');
    return [];
  }
}

async function fetchSrDetail(companyId: string, postingId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.smartrecruiters.com/v1/companies/${companyId}/postings/${postingId}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return '';
    const data = (await res.json()) as {
      jobAd?: { sections?: { jobDescription?: { text?: string }; qualifications?: { text?: string } } };
    };
    const desc = data.jobAd?.sections?.jobDescription?.text ?? '';
    const qual = data.jobAd?.sections?.qualifications?.text ?? '';
    return cleanText(stripHtml(desc + '\n\n' + qual));
  } catch {
    return '';
  }
}
