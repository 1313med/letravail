import 'dotenv/config';
import { disconnectPrisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { getContainer } from './container.js';
import type { ScrapeCategory } from './config/index.js';
import { enqueueAllCategories, enqueueCategoryScrape } from './queues/queues.js';
import { runSchedulerOnce, startScheduler } from './scheduler/index.js';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const container = getContainer();

  try {
    switch (command) {
      case 'scrape': {
        const target = args[0];
        if (target === 'linkedin') {
          if (args.includes('--fast')) {
            process.env.LINKEDIN_FAST = 'true';
          }
          const stat = await container.scrapeService.scrapeLinkedIn();
          logSummary([stat]);
          break;
        }
        if (!target || target === '--all') {
          const stats = await container.scrapeService.scrapeAll();
          logSummary(stats);
          break;
        }
        if (isCategory(target)) {
          const stats = await container.scrapeService.scrapeCategory(target);
          logSummary(stats);
          break;
        }
        const stat = await container.scrapeService.scrapeSource(target);
        logSummary([stat]);
        break;
      }
      case 'enqueue': {
        const target = args[0];
        if (!target || target === '--all') {
          await enqueueAllCategories();
          logger.info('All categories enqueued');
          break;
        }
        if (isCategory(target)) {
          await enqueueCategoryScrape(target);
          logger.info({ category: target }, 'Category enqueued');
          break;
        }
        throw new Error(`Unknown enqueue target: ${target}`);
      }
      case 'scheduler': {
        const once = args.includes('--once');
        if (once) {
          const mode = args.includes('--daily') ? 'daily' : args.includes('--6h') ? '6h' : 'all';
          await runSchedulerOnce(mode);
          logger.info({ mode }, 'Scheduler run once completed');
          break;
        }
        startScheduler();
        return;
      }
      case 'list': {
        for (const reg of container.scrapeService.getRegistry()) {
          console.log(`${reg.sourceName}\t${reg.category}\t${reg.schedule ?? 'every6hours'}`);
        }
        break;
      }
      default:
        printUsage();
    }
  } finally {
    if (command !== 'scheduler' || args.includes('--once')) {
      await container.scrapeService.shutdown();
      await disconnectPrisma();
    }
  }
}

function isCategory(value: string): value is ScrapeCategory {
  return [
    'banks',
    'telecom',
    'automotive',
    'retail',
    'airlines',
    'technology',
    'government',
    'universities',
  ].includes(value);
}

function logSummary(stats: import('./types/job.js').ScrapeRunStats[]): void {
  const totals = stats.reduce(
    (acc, s) => ({
      jobsFound: acc.jobsFound + s.jobsFound,
      jobsInserted: acc.jobsInserted + s.jobsInserted,
      jobsUpdated: acc.jobsUpdated + s.jobsUpdated,
      duplicates: acc.duplicates + s.duplicates,
      failed: acc.failed + (s.status === 'failed' ? 1 : 0),
    }),
    { jobsFound: 0, jobsInserted: 0, jobsUpdated: 0, duplicates: 0, failed: 0 },
  );
  logger.info({ sources: stats.length, ...totals }, 'Scrape summary');
}

function printUsage(): void {
  console.log(`
letravail-scraper

Usage:
  npm run scrape -- scrape [--all | <category> | <source>]
  npm run scrape -- enqueue [--all | <category>]
  npm run scrape -- scheduler [--once] [--6h | --daily]
  npm run scrape -- list

Examples:
  npm run scrape -- scrape linkedin
  npm run scrape -- scrape attijariwafa-bank
  npm run scrape -- scrape banks
  npm run scrape -- scrape --all
  npm run scrape -- enqueue banks
  npm run scrape -- scheduler --once
`);
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error');
  process.exit(1);
});
