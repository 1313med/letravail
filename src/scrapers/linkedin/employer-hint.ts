/**
 * Employer hints collected during LinkedIn crawls — fed into the discovery pipeline.
 */
export type LinkedInDiscoverySource =
  | 'job_search'
  | 'job_detail'
  | 'company_page'
  | 'related_company';

export interface LinkedInEmployerHint {
  companyName: string;
  linkedinUrl?: string;
  linkedinSlug?: string;
  location?: string;
  industry?: string;
  headquarters?: string;
  companySize?: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
  careersUrl?: string;
  hiringStatus?: 'actively_hiring' | 'unknown';
  discoverySource: LinkedInDiscoverySource;
  jobIds?: string[];
}

export function normalizeEmployerName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseLinkedInCompanyUrl(url: string): { slug: string; url: string } | null {
  try {
    const parsed = new URL(url.split('?')[0]!);
    const match = parsed.pathname.match(/\/company\/([^/]+)/i);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]!).toLowerCase();
    if (!slug || slug === 'linkedin' || slug === 'search') return null;
    return {
      slug,
      url: `https://www.linkedin.com/company/${slug}/`,
    };
  } catch {
    return null;
  }
}

export function recommendSourceName(companyName: string): string {
  return companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function sanitizeCompanyName(name: string): string {
  return name
    .replace(/\d[\d\s\u00a0.,]*abonn[eé]s?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Reject job titles, generic labels, and garbage parsed as company names. */
export function isValidEmployerName(name: string): boolean {
  const trimmed = sanitizeCompanyName(name.trim());
  if (trimmed.length < 2 || trimmed.length > 120) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'entreprise' || lower === 'company' || lower === 'confidentiel' || lower === 'bpo') {
    return false;
  }
  if (/^\d+$/.test(trimmed)) return false;
  if (/[├®├¿ÔÇÖ]/.test(trimmed)) return false;
  if (/^j'ai travaill/i.test(lower)) return false;

  const jobTitlePatterns = [
    /^(développeur|developpeur|developer|ingénieur|ingenieur|engineer)\b/i,
    /^(chef|cheffe)\b/i,
    /^(assistante?|assistant)\b/i,
    /^(chargé|chargee|chargée)\b/i,
    /^(délégué|delegue|déléguée)\b/i,
    /\b(freelance|indépendant|independant)\s*$/i,
    /^(video editor|community manager|commercial|comptable|secrétaire|secretaire)\b/i,
    /\b(cuisinier|cuisinière|cuisiniere)\b/i,
    /\b(médical|medical|médicale)\s*$/i,
    /\b(direction|rh)\s*$/i,
    /\b(senior|junior|stagiaire|intern)\s*$/i,
  ];
  if (jobTitlePatterns.some((re) => re.test(trimmed))) return false;

  return true;
}

export function isSchoolLinkedInUrl(url?: string): boolean {
  return !!url && /\/school\//i.test(url);
}

export function isMoroccoLinkedInHint(hint: LinkedInEmployerHint): boolean {
  if (hint.location && /maroc|morocco|casablanca|rabat|marrakech|fès|fes|tanger|agadir|meknès|meknes|oujda|kenitra|tétouan|tetouan/i.test(hint.location)) {
    return true;
  }
  if (hint.linkedinUrl && /\/\/ma\.linkedin\.com/i.test(hint.linkedinUrl)) return true;
  if (hint.headquarters && /maroc|morocco/i.test(hint.headquarters)) return true;
  if ((hint.jobIds?.length ?? 0) >= 1) return true;
  return hint.discoverySource !== 'related_company';
}

export function mergeEmployerHints(hints: LinkedInEmployerHint[]): LinkedInEmployerHint[] {
  const byKey = new Map<string, LinkedInEmployerHint>();

  for (const hint of hints) {
    const companyName = sanitizeCompanyName(hint.companyName);
    if (!isValidEmployerName(companyName)) continue;
    if (isSchoolLinkedInUrl(hint.linkedinUrl)) continue;
    if (hint.discoverySource === 'related_company' && !isMoroccoLinkedInHint(hint)) continue;

    const normalizedHint = { ...hint, companyName };
    const key =
      normalizedHint.linkedinSlug ??
      (normalizedHint.linkedinUrl ? parseLinkedInCompanyUrl(normalizedHint.linkedinUrl)?.slug : undefined) ??
      normalizeEmployerName(normalizedHint.companyName);

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...normalizedHint,
        linkedinSlug: normalizedHint.linkedinSlug ?? parseLinkedInCompanyUrl(normalizedHint.linkedinUrl ?? '')?.slug,
        jobIds: normalizedHint.jobIds ? [...normalizedHint.jobIds] : undefined,
      });
      continue;
    }

    byKey.set(key, {
      companyName: existing.companyName.length >= normalizedHint.companyName.length ? existing.companyName : normalizedHint.companyName,
      linkedinUrl: existing.linkedinUrl ?? normalizedHint.linkedinUrl,
      linkedinSlug: existing.linkedinSlug ?? normalizedHint.linkedinSlug,
      location: existing.location ?? normalizedHint.location,
      industry: existing.industry ?? normalizedHint.industry,
      headquarters: existing.headquarters ?? normalizedHint.headquarters,
      companySize: existing.companySize ?? normalizedHint.companySize,
      logoUrl: existing.logoUrl ?? normalizedHint.logoUrl,
      description: (existing.description?.length ?? 0) >= (normalizedHint.description?.length ?? 0)
        ? existing.description
        : normalizedHint.description,
      websiteUrl: existing.websiteUrl ?? normalizedHint.websiteUrl,
      careersUrl: existing.careersUrl ?? normalizedHint.careersUrl,
      hiringStatus:
        existing.hiringStatus === 'actively_hiring' || normalizedHint.hiringStatus === 'actively_hiring'
          ? 'actively_hiring'
          : 'unknown',
      discoverySource: preferSource(existing.discoverySource, normalizedHint.discoverySource),
      jobIds: [...new Set([...(existing.jobIds ?? []), ...(normalizedHint.jobIds ?? [])])],
    });
  }

  return [...byKey.values()];
}

function preferSource(
  a: LinkedInDiscoverySource,
  b: LinkedInDiscoverySource,
): LinkedInDiscoverySource {
  const rank: Record<LinkedInDiscoverySource, number> = {
    company_page: 4,
    job_detail: 3,
    related_company: 2,
    job_search: 1,
  };
  return rank[a] >= rank[b] ? a : b;
}
