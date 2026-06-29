/**
 * Career site intelligence — detect ATS, robots.txt, sitemap, API hints.
 */
import { detectAtsPlatform, type AtsPlatform } from './ats-registry.js';
import { logger } from '../lib/logger.js';

export interface CareerSiteProbe {
  url: string;
  finalUrl: string;
  httpStatus?: number;
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
  let httpStatus: number | undefined;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LetravailScraper/1.0', Accept: 'text/html' },
      redirect: 'follow',
    });
    httpStatus = res.status;
    finalUrl = res.url;
    html = await res.text();
  } catch (err) {
    logger.debug({ err, url }, 'Career site probe failed');
  }

  const detected = detectAtsPlatform(finalUrl) ?? ats;

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

  let talentSoftListing: string | undefined;
  if (
    /talent-soft\.com/i.test(finalUrl) ||
    /talent-soft\.com/i.test(html) ||
    /carriere\.[a-z0-9-]+\.ma/i.test(finalUrl)
  ) {
    talentSoftListing = finalUrl.includes('liste-toutes-offres')
      ? finalUrl
      : `${new URL(finalUrl).origin}/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=list`;
    apiEndpoints.push(talentSoftListing);
  }

  if (/careers\.intelcia\.com/i.test(finalUrl) || /careers\.intelcia\.com/i.test(html)) {
    apiEndpoints.push('https://careers.intelcia.com/api/offers?locale=fr_FR&country=MAR');
  }

  if (/successfactors/i.test(html) || /performancemanager\.successfactors/i.test(html)) {
    const sfMatch = html.match(/https?:\/\/[^"'\s]*successfactors[^"'\s]*/i);
    if (sfMatch) apiEndpoints.push(sfMatch[0]);
  }

  const sitemapUrls = await discoverSitemaps(finalUrl);
  const robotsAllowed = await checkRobotsAllowed(finalUrl);

  let platform = detected?.platform ?? 'custom';
  if (talentSoftListing) platform = 'talentsoft';
  if (apiEndpoints.some((e) => /intelcia\.com\/api/i.test(e))) platform = 'successfactors';
  if (workdayConfig) platform = 'workday';
  if (greenhouseMatch) platform = 'greenhouse';
  if (leverMatch) platform = 'lever';

  return {
    url,
    finalUrl,
    httpStatus,
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

const ALT_CAREER_PATHS = [
  '/carrieres', '/carrières', '/careers', '/recrutement', '/jobs', '/offres-emploi', '/nous-rejoindre',
];

export async function probeCareerSiteWithRetries(url: string): Promise<CareerSiteProbe> {
  let best = await probeCareerSite(url);
  if (best.apiEndpoints.length > 0 && best.atsPlatform !== 'custom') return best;

  let origin: string;
  try {
    origin = new URL(best.finalUrl || url).origin;
  } catch {
    return best;
  }

  for (const path of ALT_CAREER_PATHS) {
    try {
      const altUrl = `${origin}${path}`;
      if (altUrl === url || altUrl === best.finalUrl) continue;
      const alt = await probeCareerSite(altUrl);
      const altScore = scoreProbe(alt);
      const bestScore = scoreProbe(best);
      if (altScore > bestScore) best = alt;
      if (best.apiEndpoints.length > 0 && best.atsPlatform !== 'custom') break;
    } catch {
      continue;
    }
  }

  return best;
}

function scoreProbe(probe: CareerSiteProbe): number {
  let score = probe.atsPlatform !== 'custom' ? 50 : 0;
  score += probe.apiEndpoints.length * 10;
  if (probe.workdayConfig) score += 20;
  if (probe.greenhouseToken) score += 20;
  if (probe.leverSlug) score += 20;
  return score;
}
