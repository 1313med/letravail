/**
 * Adaptive crawl intelligence — learns intervals from publishing behaviour.
 */
import type { PrismaClient } from '@prisma/client';
import {
  DAILY_CRAWL_INTERVAL_MINUTES,
  getCrawlInterval,
} from './crawl-schedule.js';

const MIN_INTERVAL = 30;
const MAX_INTERVAL = DAILY_CRAWL_INTERVAL_MINUTES;

export interface CrawlLearningResult {
  sourceName: string;
  previousInterval: number;
  newInterval: number;
  reason: string;
  newJobsLast7d: number;
  avgJobsPerCrawl: number;
}

export async function learnCrawlInterval(
  db: PrismaClient,
  sourceName: string,
): Promise<CrawlLearningResult> {
  const profile = await db.sourceProfile.findUnique({ where: { sourceName } });
  const previousInterval = profile?.crawlIntervalMinutes ?? getCrawlInterval(sourceName);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newJobsLast7d = await db.job.count({
    where: { source: sourceName, firstSeenAt: { gte: sevenDaysAgo } },
  });

  const recentLogs = await db.scrapeLog.findMany({
    where: { source: sourceName, status: { in: ['success', 'partial'] } },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: { jobsFound: true, jobsInserted: true },
  });

  const avgJobsPerCrawl =
    recentLogs.length > 0
      ? recentLogs.reduce((a, l) => a + l.jobsInserted, 0) / recentLogs.length
      : 0;

  const failureRate = profile?.failureRate ?? 0;
  let newInterval = previousInterval;
  let reason = 'No change';

  if (failureRate > 0.4) {
    newInterval = Math.min(MAX_INTERVAL, previousInterval * 2);
    reason = 'High failure rate — slowing crawl';
  } else if (newJobsLast7d >= 20 || avgJobsPerCrawl >= 5) {
    newInterval = Math.max(MIN_INTERVAL, Math.round(previousInterval * 0.75));
    reason = 'High publishing velocity — increasing frequency';
  } else if (newJobsLast7d === 0 && (profile?.activeJobs ?? 0) < 3) {
    newInterval = Math.min(MAX_INTERVAL, previousInterval * 1.5);
    reason = 'Stale source — reducing frequency';
  } else if (newJobsLast7d <= 2 && previousInterval < 360) {
    newInterval = Math.min(360, previousInterval + 60);
    reason = 'Low discovery rate — moderate slowdown';
  }

  newInterval = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, newInterval));

  if (newInterval !== previousInterval) {
    await db.sourceProfile.update({
      where: { sourceName },
      data: { crawlIntervalMinutes: newInterval },
    });
  }

  return { sourceName, previousInterval, newInterval, reason, newJobsLast7d, avgJobsPerCrawl };
}

export async function learnAllSourceIntervals(db: PrismaClient): Promise<CrawlLearningResult[]> {
  const profiles = await db.sourceProfile.findMany({ where: { status: 'active' } });
  const results: CrawlLearningResult[] = [];
  for (const p of profiles) {
    results.push(await learnCrawlInterval(db, p.sourceName));
  }
  return results;
}
