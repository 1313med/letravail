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
} as const;

export type ScrapeCategory =
  | 'banks'
  | 'telecom'
  | 'automotive'
  | 'retail'
  | 'airlines'
  | 'technology'
  | 'government'
  | 'universities';

export const QUEUE_NAMES = {
  banks: 'scrape-banks',
  telecom: 'scrape-telecom',
  automotive: 'scrape-automotive',
  retail: 'scrape-retail',
  government: 'scrape-government',
  universities: 'scrape-universities',
} as const satisfies Record<Exclude<ScrapeCategory, 'airlines' | 'technology'>, string>;

export const EXTENDED_QUEUE_NAMES = {
  ...QUEUE_NAMES,
  airlines: 'scrape-airlines',
  technology: 'scrape-technology',
} as const;

export type QueueName = (typeof EXTENDED_QUEUE_NAMES)[keyof typeof EXTENDED_QUEUE_NAMES];

export function getQueueForCategory(category: ScrapeCategory): QueueName {
  return EXTENDED_QUEUE_NAMES[category];
}
