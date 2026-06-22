import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/letravail?schema=public',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  maxConcurrentSources: Number(process.env.MAX_CONCURRENT_SOURCES ?? 5),
  pagePoolSize: Number(process.env.PAGE_POOL_SIZE ?? 3),
  browserHeadless: process.env.BROWSER_HEADLESS !== 'false',
  scrapeTimeoutMs: Number(process.env.SCRAPE_TIMEOUT_MS ?? 60_000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  retryDelaysMs: [1_000, 3_000, 10_000] as const,
  maxRetryAttempts: 3,
  cronEvery6Hours: '0 */6 * * *',
  cronDaily: '0 2 * * *',
  linkedinStorageState: process.env.LINKEDIN_STORAGE_STATE ?? './linkedin-auth.json',
  linkedinMaxJobs: Number(process.env.LINKEDIN_MAX_JOBS ?? 150),
  linkedinDelayMs: Number(process.env.LINKEDIN_DELAY_MS ?? 2_000),
  linkedinScrollRounds: Number(process.env.LINKEDIN_SCROLL_ROUNDS ?? 8),
  linkedinDetailFetchLimit: Number(process.env.LINKEDIN_DETAIL_FETCH_LIMIT ?? 0),
  linkedinPageTimeoutMs: Number(process.env.LINKEDIN_PAGE_TIMEOUT_MS ?? 25_000),
  linkedinMaxPages: Number(process.env.LINKEDIN_MAX_PAGES ?? 10),
  linkedinFast: process.env.LINKEDIN_FAST === 'true',
} as const;

export type ScrapeCategory =
  | 'banks'
  | 'telecom'
  | 'automotive'
  | 'retail'
  | 'airlines'
  | 'technology'
  | 'government'
  | 'universities'
  | 'linkedin';

export const QUEUE_NAMES = {
  banks: 'scrape-banks',
  telecom: 'scrape-telecom',
  automotive: 'scrape-automotive',
  retail: 'scrape-retail',
  government: 'scrape-government',
  universities: 'scrape-universities',
} as const satisfies Record<Exclude<ScrapeCategory, 'airlines' | 'technology' | 'linkedin'>, string>;

export const EXTENDED_QUEUE_NAMES = {
  ...QUEUE_NAMES,
  airlines: 'scrape-airlines',
  technology: 'scrape-technology',
  linkedin: 'scrape-linkedin',
} as const;

export type QueueName = (typeof EXTENDED_QUEUE_NAMES)[keyof typeof EXTENDED_QUEUE_NAMES];

export function getQueueForCategory(category: ScrapeCategory): QueueName {
  return EXTENDED_QUEUE_NAMES[category];
}
