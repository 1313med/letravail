/**
 * Career site intelligence — detect ATS, robots.txt, sitemap, API hints.
 */
import { detectAtsPlatform, type AtsPlatform } from './ats-registry.js';
import { logger } from '../lib/logger.js';

export interface CareerSiteProbe {
  url: string;
  finalUrl: string;
  atsPlatform: AtsPlatform;
  robotsAllowed: boolean;
  sitemapUrls: string[];
  apiEndpoints: string[];
  workdayConfig?: { host: string; tenant: string; site: string };
  greenhouseToken?: string;
  leverSlug?: string;
}

const MOROCCO_FILTER = /morocco|maroc|casablanca|rabat|marrakech|tanger|agadir|fès|fez|remote/i;

export async function probeCareerSite(url: string): Promise<CareerSiteProbe> {
  const apiEndpoints: string[] = [];
  const ats = detectAtsPlatform(url);
  let finalUrl = url;
  let html = '';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LetravailScraper/1.0', Accept: 'text/html' },
      redirect: 'follow',
    });
    finalUrl = res.url;
    html = await res.text();
  } catch (err) {
    logger.debug({ err, url }, 'Career site probe failed');
  }

  const detected = detectAtsPlatform(finalUrl) ?? ats;
  const platform = detected?.platform ?? 'custom';

  const greenhouseMatch = html.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i)
    ?? finalUrl.match(/greenhouse\.io\/([a-z0-9_-]+)/i);
  const leverMatch = html.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i)
    ?? html.match(/api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/i);
  const workdayMatch = finalUrl.match(/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com(?:\/([a-z]{2}(?:-[A-Z]{2})?))?/i)
    ?? html.match(/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com/i);

  let workdayConfig: CareerSiteProbe['workdayConfig'];
  if (workdayMatch) {
    const tenant = workdayMatch[1]!;
    const host = `${tenant}.${workdayMatch[2]!}.myworkdayjobs.com`;
    const site = workdayMatch[3] ?? 'External';
    workdayConfig = { host, tenant, site };
    apiEndpoints.push(`https://${host}/wday/cxs/${tenant}/${site}/jobs`);
  }

  if (html.includes('rec-job-search') || html.includes('csod.com')) {
    apiEndpoints.push('csod:rec-job-search');
  }

  const sitemapUrls = await discoverSitemaps(finalUrl);
  const robotsAllowed = await checkRobotsAllowed(finalUrl);

  return {
    url,
    finalUrl,
    atsPlatform: platform,
    robotsAllowed,
    sitemapUrls,
    apiEndpoints,
    workdayConfig,
    greenhouseToken: greenhouseMatch?.[1],
    leverSlug: leverMatch?.[1],
  };
}

async function discoverSitemaps(baseUrl: string): Promise<string[]> {
  try {
    const origin = new URL(baseUrl).origin;
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': 'LetravailScraper/1.0' } });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split('\n')
      .filter((l) => /^sitemap:/i.test(l))
      .map((l) => l.replace(/^sitemap:\s*/i, '').trim())
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function checkRobotsAllowed(url: string): Promise<boolean> {
  try {
    const origin = new URL(url).origin;
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': 'LetravailScraper/1.0' } });
    if (!res.ok) return true;
    const text = await res.text();
    return !/disallow:\s*\/\s*$/im.test(text);
  } catch {
    return true;
  }
}

export { MOROCCO_FILTER };
