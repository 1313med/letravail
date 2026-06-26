/**
 * Adaptive crawl schedule — per-source intervals in minutes.
 * High-value / high-freshness sources crawl more frequently.
 */
export interface CrawlScheduleEntry {
  sourceName: string;
  intervalMinutes: number;
  priority: number;
  reason: string;
}

export const ADAPTIVE_CRAWL_SCHEDULE: CrawlScheduleEntry[] = [
  { sourceName: 'cih-bank', intervalMinutes: 30, priority: 100, reason: 'High volume, daily updates' },
  { sourceName: 'linkedin', intervalMinutes: 60, priority: 95, reason: 'Highest freshness, aggregator' },
  { sourceName: 'attijariwafa-bank', intervalMinutes: 60, priority: 90, reason: 'Rich API, frequent updates' },
  { sourceName: 'dxc-technology', intervalMinutes: 120, priority: 70, reason: 'Tech hiring cycles' },
  { sourceName: 'bank-of-africa', intervalMinutes: 120, priority: 70, reason: 'Banking updates' },
  { sourceName: 'bmci', intervalMinutes: 180, priority: 65, reason: 'Banking' },
  { sourceName: 'capgemini', intervalMinutes: 240, priority: 60, reason: 'Tech consulting' },
  { sourceName: 'cgi', intervalMinutes: 240, priority: 60, reason: 'Tech consulting' },
  { sourceName: 'inwi', intervalMinutes: 360, priority: 55, reason: 'Telecom' },
  { sourceName: 'maroc-telecom', intervalMinutes: 360, priority: 55, reason: 'Telecom' },
  { sourceName: 'orange-maroc', intervalMinutes: 360, priority: 55, reason: 'Telecom' },
  { sourceName: 'anapec', intervalMinutes: 360, priority: 75, reason: 'Public employment' },
  { sourceName: 'intelcia', intervalMinutes: 120, priority: 88, reason: 'BPO high volume' },
  { sourceName: 'teleperformance-maroc', intervalMinutes: 120, priority: 87, reason: 'BPO high volume' },
  { sourceName: 'foundever-maroc', intervalMinutes: 180, priority: 85, reason: 'BPO' },
  { sourceName: 'concentrix-maroc', intervalMinutes: 180, priority: 84, reason: 'BPO' },
  { sourceName: 'banque-populaire', intervalMinutes: 120, priority: 88, reason: 'Banking — Workday API' },
  { sourceName: 'credit-du-maroc', intervalMinutes: 180, priority: 82, reason: 'Banking' },
  { sourceName: 'credit-agricole-maroc', intervalMinutes: 180, priority: 80, reason: 'Banking' },
  { sourceName: 'comdata', intervalMinutes: 240, priority: 80, reason: 'BPO' },
  { sourceName: 'royal-air-maroc', intervalMinutes: 720, priority: 50, reason: 'Airlines' },
];
export const DEFAULT_CRAWL_INTERVAL_MINUTES = 360;
export const DAILY_CRAWL_INTERVAL_MINUTES = 1440;

export function getCrawlInterval(sourceName: string, schedule?: 'every6hours' | 'daily'): number {
  if (schedule === 'daily') return DAILY_CRAWL_INTERVAL_MINUTES;
  const entry = ADAPTIVE_CRAWL_SCHEDULE.find((e) => e.sourceName === sourceName);
  return entry?.intervalMinutes ?? DEFAULT_CRAWL_INTERVAL_MINUTES;
}

export function getCronForInterval(minutes: number): string {
  if (minutes <= 30) return '*/30 * * * *';
  if (minutes <= 60) return '0 * * * *';
  if (minutes <= 120) return '0 */2 * * *';
  if (minutes <= 180) return '0 */3 * * *';
  if (minutes <= 360) return '0 */6 * * *';
  return '0 2 * * *';
}

export function isSourceDue(lastCrawlAt: Date | null | undefined, intervalMinutes: number): boolean {
  if (!lastCrawlAt) return true;
  const elapsed = Date.now() - lastCrawlAt.getTime();
  return elapsed >= intervalMinutes * 60_000;
}

export function computeNextCrawlAt(intervalMinutes: number, from = new Date()): Date {
  return new Date(from.getTime() + intervalMinutes * 60_000);
}
