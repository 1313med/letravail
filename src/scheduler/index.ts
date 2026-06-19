import { CronJob } from 'cron';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { enqueueAllCategories, enqueueCategoryScrape } from '../queues/queues.js';
import { scraperRegistry } from '../scrapers/registry.js';
import type { ScrapeCategory } from '../config/index.js';

const jobs: CronJob[] = [];

function startCron(pattern: string, name: string, handler: () => Promise<void>): void {
  const job = new CronJob(pattern, () => {
    handler().catch((err) => logger.error({ err, name }, 'Scheduled job failed'));
  });
  job.start();
  jobs.push(job);
  logger.info({ name, pattern }, 'Cron job registered');
}

export function startScheduler(): void {
  startCron(config.cronEvery6Hours, 'scrape-all-6h', async () => {
    const frequent = scraperRegistry.filter((r) => r.schedule !== 'daily');
    const categories = [...new Set(frequent.map((r) => r.category))] as ScrapeCategory[];
    await Promise.all(categories.map((c) => enqueueCategoryScrape(c)));
    logger.info({ categories }, 'Enqueued 6-hour scrape jobs');
  });

  startCron(config.cronDaily, 'scrape-daily', async () => {
    const daily = scraperRegistry.filter((r) => r.schedule === 'daily');
    const categories = [...new Set(daily.map((r) => r.category))] as ScrapeCategory[];
    await Promise.all(categories.map((c) => enqueueCategoryScrape(c)));
    logger.info({ categories }, 'Enqueued daily scrape jobs');
  });

  logger.info('Scheduler running');
}

export async function runSchedulerOnce(mode: 'all' | '6h' | 'daily' = 'all'): Promise<void> {
  if (mode === 'all') {
    await enqueueAllCategories();
    return;
  }

  if (mode === '6h') {
    const categories = [...new Set(
      scraperRegistry.filter((r) => r.schedule !== 'daily').map((r) => r.category),
    )] as ScrapeCategory[];
    await Promise.all(categories.map((c) => enqueueCategoryScrape(c)));
    return;
  }

  const categories = [...new Set(
    scraperRegistry.filter((r) => r.schedule === 'daily').map((r) => r.category),
  )] as ScrapeCategory[];
  await Promise.all(categories.map((c) => enqueueCategoryScrape(c)));
}

export function stopScheduler(): void {
  for (const job of jobs) job.stop();
  jobs.length = 0;
}
