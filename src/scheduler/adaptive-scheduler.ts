import { CronJob } from 'cron';
import { logger } from '../lib/logger.js';
import { getContainer } from '../container.js';
import { getPrisma } from '../lib/prisma.js';
import { enqueueSourceScrape, enqueueLinkedInScrape } from '../queues/queues.js';
import { isSourceDue } from '../platform/crawl-schedule.js';
import { refreshAllPriorities } from '../platform/source-priority-engine.js';
import { EmployerActivationEngine } from '../platform/employer-activation-engine.js';

const jobs: CronJob[] = [];
let activationTickCount = 0;

/**
 * Adaptive scheduler — checks every minute which sources are due for crawl.
 * Replaces fixed 6h/daily schedules with per-source intelligence-driven intervals.
 */
export function startAdaptiveScheduler(): void {
  const tick = new CronJob('* * * * *', () => {
    runAdaptiveTick().catch((err) => logger.error({ err }, 'Adaptive scheduler tick failed'));
  });
  tick.start();
  jobs.push(tick);

  logger.info('Adaptive scheduler started (checks every minute)');
}

export async function runAdaptiveTick(): Promise<void> {
  const { sourceProfileRepo } = getContainer();
  await sourceProfileRepo.syncFromRegistry(getContainer().scrapeService.getRegistry());
  await refreshAllPriorities(getPrisma()).catch(() => undefined);

  activationTickCount++;
  if (activationTickCount % 15 === 0) {
    const { scrapeService } = getContainer();
    const engine = new EmployerActivationEngine(getPrisma(), scrapeService);
    await engine.retryReadyEmployers().catch(() => undefined);
    await engine.recalculateHealth(10).catch(() => undefined);
    await engine.activateReadyEmployers(5).catch(() => undefined);
  }

  const due = await sourceProfileRepo.getDueSources();

  for (const { sourceName, category } of due) {
    const profile = await sourceProfileRepo.getProfile(sourceName);
    if (!profile) continue;

    if (!isSourceDue(profile.lastCrawlAt, profile.crawlIntervalMinutes)) continue;

    logger.info(
      { source: sourceName, interval: profile.crawlIntervalMinutes },
      'Enqueueing adaptive crawl',
    );

    if (sourceName === 'linkedin') {
      await enqueueLinkedInScrape();
    } else {
      await enqueueSourceScrape(sourceName, category);
    }
  }
}

export function stopAdaptiveScheduler(): void {
  for (const job of jobs) job.stop();
  jobs.length = 0;
}
