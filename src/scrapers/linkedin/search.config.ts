/** Moroccan cities for LinkedIn job search (location = "{city}, Morocco"). */
export const MOROCCO_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Mohammedia',
  'Laayoune',
] as const;

/** LinkedIn f_TPR values: r86400=24h, r604800=7d, r2592000=30d. Empty = all time. */
export function getLinkedInTimeFilter(): string | undefined {
  const value = process.env.LINKEDIN_TIME_FILTER?.trim();
  if (!value || value === 'all') return undefined;
  return value;
}

export const LINKEDIN_JOBS_PER_PAGE = 25;

export function getLinkedInCities(): string[] {
  const fromEnv = process.env.LINKEDIN_CITIES?.trim();
  if (fromEnv) {
    return fromEnv.split(',').map((c) => c.trim()).filter(Boolean);
  }
  if (process.env.LINKEDIN_FAST === 'true') {
    return ['Casablanca', 'Rabat', 'Marrakech'];
  }
  return [...MOROCCO_CITIES];
}

export function buildLinkedInMoroccoSearchUrl(start = 0): string {
  const params = new URLSearchParams({
    location: 'Morocco',
    start: String(start),
  });
  const timeFilter = getLinkedInTimeFilter();
  if (timeFilter) params.set('f_TPR', timeFilter);
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

export function buildLinkedInSearchUrl(city: string, start = 0): string {
  const params = new URLSearchParams({
    location: `${city}, Morocco`,
    start: String(start),
  });
  const timeFilter = getLinkedInTimeFilter();
  if (timeFilter) params.set('f_TPR', timeFilter);
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

export function buildLinkedInJobUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs/view/${jobId}/`;
}
