import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const now = new Date();
const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const newJobs24h = await db.job.count({ where: { firstSeenAt: { gte: dayAgo } } });
const expired24h = await db.job.count({ where: { archivedAt: { gte: dayAgo } } });
const newJobs7d = await db.job.count({ where: { firstSeenAt: { gte: weekAgo } } });

const sources = await db.sourceProfile.findMany({
  where: { status: 'active' },
  orderBy: { freshnessScore: 'desc' },
});

const avgLatency = await db.job.aggregate({
  where: { firstSeenAt: { gte: weekAgo }, sourcePublishedAt: { not: null } },
  _avg: { crawlCount: true },
});

const jobsWithDelay = await db.job.findMany({
  where: { firstSeenAt: { gte: weekAgo }, sourcePublishedAt: { not: null } },
  select: { firstSeenAt: true, sourcePublishedAt: true },
  take: 500,
});

const avgDelayHours =
  jobsWithDelay.length > 0
    ? Math.round(
        jobsWithDelay.reduce((a, j) => {
          const delay = j.firstSeenAt.getTime() - (j.sourcePublishedAt?.getTime() ?? j.firstSeenAt.getTime());
          return a + delay;
        }, 0) /
          jobsWithDelay.length /
          3_600_000,
      )
    : 0;

const lines = [
  '# Daily Freshness Report',
  `Generated: ${now.toISOString()}`,
  '',
  '## Last 24 Hours',
  `- New jobs discovered: **${newJobs24h}**`,
  `- Jobs expired/archived: **${expired24h}**`,
  '',
  '## Last 7 Days',
  `- New jobs discovered: **${newJobs7d}**`,
  `- Avg publication delay: **${avgDelayHours}h** (where sourcePublishedAt known)`,
  '',
  '## Source Freshness Ranking',
  '',
  '| Source | Freshness | Active Jobs | Last Crawl | Interval |',
  '|--------|-----------|-------------|------------|----------|',
];

for (const s of sources.slice(0, 25)) {
  lines.push(
    `| ${s.sourceName} | ${s.freshnessScore ?? '—'} | ${s.activeJobs} | ${s.lastCrawlAt?.toISOString().slice(0, 16) ?? 'never'} | ${s.crawlIntervalMinutes}m |`,
  );
}

const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'freshness-report.md'), lines.join('\n'), 'utf-8');
console.log('Wrote reports/freshness-report.md');

await db.$disconnect();
