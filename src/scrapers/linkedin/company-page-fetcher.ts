/**
 * Fetch public LinkedIn company page metadata (no auth required for basic fields).
 */
import { logger } from '../../lib/logger.js';
import { cleanText } from '../../utils/cleaning.js';
import type { LinkedInEmployerHint } from './employer-hint.js';
import { parseLinkedInCompanyUrl } from './employer-hint.js';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

export interface LinkedInCompanyProfile {
  companyName: string;
  linkedinUrl: string;
  linkedinSlug: string;
  industry?: string;
  headquarters?: string;
  location?: string;
  companySize?: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
}

export async function fetchLinkedInCompanyProfile(
  slugOrUrl: string,
): Promise<LinkedInCompanyProfile | null> {
  const parsed = slugOrUrl.startsWith('http')
    ? parseLinkedInCompanyUrl(slugOrUrl)
    : { slug: slugOrUrl.toLowerCase(), url: `https://www.linkedin.com/company/${slugOrUrl}/` };

  if (!parsed) return null;

  try {
    const res = await fetch(parsed.url, { headers: FETCH_HEADERS, redirect: 'follow' });
    if (!res.ok) {
      logger.debug({ slug: parsed.slug, status: res.status }, 'LinkedIn company page fetch failed');
      return null;
    }

    const html = await res.text();
    if (html.length < 200) return null;

    return parseCompanyPageHtml(html, parsed.slug, parsed.url);
  } catch (err) {
    logger.debug({ err, slug: parsed.slug }, 'LinkedIn company page fetch error');
    return null;
  }
}

function parseCompanyPageHtml(html: string, slug: string, url: string): LinkedInCompanyProfile | null {
  const ogTitle = metaContent(html, 'og:title');
  const ogDescription = metaContent(html, 'og:description');
  const ogImage = metaContent(html, 'og:image');

  const companyName =
    cleanText(stripTags(ogTitle?.replace(/\s*\|\s*LinkedIn.*$/i, '') ?? '')) ||
    cleanText(stripTags(titleTag(html) ?? '')) ||
    slugToName(slug);

  if (!companyName || companyName.length < 2) return null;

  const websiteUrl = extractWebsiteUrl(html);
  const { industry, size, headquarters, location } = extractAboutFields(html);

  return {
    companyName,
    linkedinUrl: url,
    linkedinSlug: slug,
    industry: industry || undefined,
    headquarters: headquarters || undefined,
    location: location || headquarters || undefined,
    companySize: size || undefined,
    logoUrl: ogImage || undefined,
    description: ogDescription ? cleanText(ogDescription) : undefined,
    websiteUrl: websiteUrl || undefined,
  };
}

export function companyProfileToHint(profile: LinkedInCompanyProfile): LinkedInEmployerHint {
  return {
    companyName: profile.companyName,
    linkedinUrl: profile.linkedinUrl,
    linkedinSlug: profile.linkedinSlug,
    industry: profile.industry,
    headquarters: profile.headquarters,
    location: profile.location,
    companySize: profile.companySize,
    logoUrl: profile.logoUrl,
    description: profile.description,
    websiteUrl: profile.websiteUrl,
    hiringStatus: 'unknown',
    discoverySource: 'company_page',
  };
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i',
  );
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function titleTag(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractWebsiteUrl(html: string): string | null {
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]!) as Record<string, unknown>;
      const sameAs = data.sameAs;
      if (typeof sameAs === 'string' && sameAs.startsWith('http') && !sameAs.includes('linkedin.com')) {
        return sameAs;
      }
      if (Array.isArray(sameAs)) {
        const site = sameAs.find(
          (u) => typeof u === 'string' && u.startsWith('http') && !u.includes('linkedin.com'),
        );
        if (typeof site === 'string') return site;
      }
      if (typeof data.url === 'string' && !data.url.includes('linkedin.com')) return data.url;
    } catch {
      /* ignore */
    }
  }

  const websiteLink = html.match(
    /href=["'](https?:\/\/(?!www\.linkedin\.com)[^"']+)["'][^>]*>[\s\S]{0,40}(?:site web|website|site officiel)/i,
  );
  if (websiteLink?.[1]) return websiteLink[1];

  const topCardWebsite = html.match(/class="[^"]*link-without-visited-state[^"]*"[^>]*href=["'](https?:\/\/[^"']+)["']/i);
  if (topCardWebsite?.[1] && !topCardWebsite[1].includes('linkedin.com')) {
    return topCardWebsite[1];
  }

  return null;
}

function extractAboutFields(html: string): {
  industry?: string;
  size?: string;
  headquarters?: string;
  location?: string;
} {
  const text = stripTags(html);
  const industry =
    text.match(/(?:Secteur|Industry)[:\s]+([A-Za-zÀ-ÿ0-9\s&,\-]{3,60})/i)?.[1]?.trim() ??
    text.match(/"industry"\s*:\s*"([^"]+)"/i)?.[1];
  const size =
    text.match(/(?:Taille de l['']entreprise|Company size)[:\s]+([0-9,\-\s]+(?:employés|employees)[^.<]{0,30})/i)?.[1]?.trim() ??
    text.match(/"numberOfEmployees"[^}]*"name"\s*:\s*"([^"]+)"/i)?.[1];
  const headquarters =
    text.match(/(?:Siège social|Headquarters)[:\s]+([A-Za-zÀ-ÿ\s,\-]{3,60})/i)?.[1]?.trim();
  const location =
    text.match(/(?:Localisation|Location)[:\s]+([A-Za-zÀ-ÿ\s,\-]{3,60})/i)?.[1]?.trim();

  return {
    industry: industry ? cleanText(industry) : undefined,
    size: size ? cleanText(size) : undefined,
    headquarters: headquarters ? cleanText(headquarters) : undefined,
    location: location ? cleanText(location) : undefined,
  };
}
