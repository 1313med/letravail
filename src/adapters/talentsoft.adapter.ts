/**
 * TalentSoft (Lumesse) career portal adapter.
 * Used by Banque Populaire and other Moroccan employers.
 */
import type { Page } from 'playwright';
import type { Job } from '../types/job.js';
import type { PagePool } from '../lib/browser/page-pool.js';
import { logger } from '../lib/logger.js';

export interface TalentSoftConfig {
  sourceName: string;
  companyName: string;
  listingUrl: string;
  tags: string[];
  defaultCity?: string;
}

export async function fetchTalentSoftJobs(
  config: TalentSoftConfig,
  pagePool: PagePool,
): Promise<Job[]> {
  const page = await pagePool.acquire();
  try {
    const listingUrl = normalizeTalentSoftListingUrl(config.listingUrl);
    const listings = await collectAllListings(page, listingUrl);
    if (listings.length === 0) return [];

    const jobs: Job[] = [];
    const maxDetails = Math.min(listings.length, 300);
    for (const listing of listings.slice(0, maxDetails)) {
      let description = listing.title;
      let contractType: string | undefined;
      let city = config.defaultCity ?? 'Casablanca';

      try {
        const detail = await fetchTalentSoftDetail(page, listing.applicationUrl);
        description = detail.description || description;
        contractType = detail.contractType;
        city = detail.city || city;
      } catch {
        /* keep listing */
      }

      jobs.push({
        source: config.sourceName,
        sourceJobId: listing.sourceJobId,
        title: listing.title,
        company: config.companyName,
        city,
        country: 'Morocco',
        description,
        applicationUrl: listing.applicationUrl,
        contractType,
        tags: config.tags,
        publishedAt: parseTalentSoftDate(listing.meta),
      });
    }

    logger.info({ source: config.sourceName, count: jobs.length }, 'TalentSoft jobs fetched');
    return jobs;
  } catch (err) {
    logger.error({ err, source: config.sourceName }, 'TalentSoft fetch error');
    return [];
  } finally {
    await pagePool.release(page);
  }
}

async function fetchTalentSoftDetail(
  page: Page,
  url: string,
): Promise<{ description: string; city?: string; contractType?: string }> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(1_500);

  return page.evaluate(() => {
    const descriptionEl =
      document.querySelector('#ctl00_ctl00_corpsRoot_corps_DescriptionOffer') ??
      document.querySelector('[id*="DescriptionOffer"]') ??
      document.querySelector('.description-offre, .offer-description, [class*="description"]');

    const metaText = document.body?.innerText ?? '';
    const cityMatch = metaText.match(/Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|Oujda|La[aâ]youne|Nador|Kenitra|K[eé]nitra/i);
    const contractMatch = metaText.match(/\b(CDI|CDD|Anapec|Stage)\b/i);

    const description = cleanTextLocal(descriptionEl?.textContent ?? metaText.slice(0, 4000));

    return {
      description,
      city: cityMatch?.[0],
      contractType: contractMatch?.[1],
    };

    function cleanTextLocal(text: string): string {
      return text.replace(/\s+/g, ' ').trim();
    }
  });
}

function parseTalentSoftDate(meta: string): Date | undefined {
  const match = meta.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return new Date(`${year}-${month}-${day}`);
}

async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const btn = page.locator('button, a').filter({ hasText: /tout accepter|accepter tous|accept all/i }).first();
    if (await btn.isVisible({ timeout: 2_000 })) await btn.click();
  } catch {
    /* no banner */
  }
}

function normalizeTalentSoftListingUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.pathname.includes('liste-toutes-offres')) {
    parsed.searchParams.set('all', '1');
    parsed.searchParams.set('mode', 'list');
    return parsed.href;
  }
  return `${parsed.origin}/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=list`;
}

async function collectAllListings(page: Page, startUrl: string) {
  const seen = new Set<string>();
  const all: Awaited<ReturnType<typeof extractListings>> = [];

  const urlsToTry = listingUrlVariants(startUrl);
  for (const listUrl of urlsToTry) {
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.waitForTimeout(2_000);
    await dismissCookieBanner(page);
    await expandTalentSoftListing(page);

    let url = listUrl;
    const maxPages = 30;

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      if (pageNum > 0) {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
        await page.waitForTimeout(1_500);
        await dismissCookieBanner(page);
        await expandTalentSoftListing(page);
      }

      const batch = await extractListings(page);
      let added = 0;
      for (const item of batch) {
        if (seen.has(item.applicationUrl)) continue;
        seen.add(item.applicationUrl);
        all.push(item);
        added++;
      }

      const nextUrl = await findNextTalentSoftPage(page, url);
      if (!nextUrl || (added === 0 && pageNum > 0)) break;
      if (nextUrl === url) break;
      url = nextUrl;
    }
  }

  return all;
}

function listingUrlVariants(startUrl: string): string[] {
  const origin = new URL(startUrl).origin;
  return [
    `${origin}/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=list`,
    `${origin}/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=layer`,
    normalizeTalentSoftListingUrl(startUrl),
  ];
}

async function expandTalentSoftListing(page: Page): Promise<void> {
  for (let round = 0; round < 20; round++) {
    const before = await page.evaluate(
      () => document.querySelectorAll('a[href*="offre-de-emploi/emploi-"]').length,
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    try {
      const loadMore = page.locator('a, button').filter({
        hasText: /voir plus|afficher plus|plus d.offres|load more|show more/i,
      }).first();
      if (await loadMore.isVisible({ timeout: 400 })) {
        await loadMore.click();
        await page.waitForTimeout(1_200);
      }
    } catch {
      /* no button */
    }
    const after = await page.evaluate(
      () => document.querySelectorAll('a[href*="offre-de-emploi/emploi-"]').length,
    );
    if (after <= before) break;
  }
}

async function findNextTalentSoftPage(page: Page, currentUrl: string): Promise<string | null> {
  const next = await page.evaluate(() => {
    const nextLink =
      document.querySelector('a[rel="next"]') ??
      Array.from(document.querySelectorAll('a')).find((a) =>
        /suivant|next|›|»/i.test(a.textContent ?? ''),
      );
    if (nextLink && (nextLink as HTMLAnchorElement).href) {
      return (nextLink as HTMLAnchorElement).href;
    }

    const pager = document.querySelector('[class*="pager"], [class*="pagination"], .pagination');
    if (pager) {
      const active = pager.querySelector('.active, .selected, [aria-current="page"]');
      const links = Array.from(pager.querySelectorAll('a[href*="liste-toutes-offres"]'));
      if (active && links.length > 0) {
        const activeIdx = links.findIndex((l) => l.classList.contains('active') || l.getAttribute('aria-current'));
        const nextA = links[activeIdx + 1] as HTMLAnchorElement | undefined;
        if (nextA?.href) return nextA.href;
      }
    }
    return null;
  });

  if (next) return next;

  const parsed = new URL(currentUrl);
  const pageParam = parsed.searchParams.get('page') ?? parsed.searchParams.get('pageIndex');
  const currentPage = pageParam ? Number(pageParam) : 1;
  parsed.searchParams.set('page', String(currentPage + 1));
  const candidate = parsed.href;
  if (candidate === currentUrl) return null;

  const count = await page.evaluate(() =>
    document.querySelectorAll('a[href*="offre-de-emploi/emploi-"]').length,
  );
  if (count >= 10) return candidate;
  return null;
}

async function extractListings(page: Page) {
  return page.evaluate(() => {
    const results: Array<{
      sourceJobId: string;
      title: string;
      applicationUrl: string;
      meta: string;
    }> = [];
    const seen = new Set<string>();

    const anchors = Array.from(document.querySelectorAll('a[href*="offre-de-emploi/emploi-"]'));
    for (let i = 0; i < anchors.length; i++) {
      const el = anchors[i] as HTMLAnchorElement;
      const href = el.href;
      const title = el.textContent?.trim() ?? '';
      if (!href || title.length < 8 || seen.has(href)) continue;
      seen.add(href);
      results.push({
        sourceJobId: href.match(/_(\d+)\.aspx/i)?.[1] ?? href.slice(-40),
        title,
        applicationUrl: href,
        meta: '',
      });
    }

    const headings = Array.from(document.querySelectorAll('h3, h2'));
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i]!;
      const title = heading.textContent?.trim() ?? '';
      const link = heading.querySelector('a') ?? heading.closest('a');
      if (!link) continue;
      const href = (link as HTMLAnchorElement).href;
      if (!href || !/offre-de-emploi\/emploi-/i.test(href) || title.length < 8 || seen.has(href)) continue;
      seen.add(href);
      const container = heading.closest('article, li, div, section, tr');
      const meta = container?.textContent?.replace(title, '').trim().slice(0, 200) ?? '';
      results.push({
        sourceJobId: href.match(/_(\d+)\.aspx/i)?.[1] ?? href.slice(-40),
        title,
        applicationUrl: href,
        meta,
      });
    }

    return results;
  });
}

export function isTalentSoftUrl(url: string): boolean {
  return (
    /talent-soft\.com/i.test(url) ||
    /carriere\.[a-z0-9-]+\.ma/i.test(url) ||
    /\/offre-de-emploi\/liste/i.test(url)
  );
}
