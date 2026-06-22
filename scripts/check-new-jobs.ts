import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();

const total = await db.job.count();
const lastLog = await db.scrapeLog.findFirst({
  orderBy: { startedAt: 'desc' },
  select: {
    startedAt: true,
    endedAt: true,
    jobsFound: true,
    jobsInserted: true,
    jobsUpdated: true,
    duplicates: true,
    status: true,
  },
});

const sinceLastScrape = lastLog
  ? await db.job.count({ where: { createdAt: { gt: lastLog.startedAt } } })
  : 0;

const recent = await db.job.findMany({
  where: lastLog ? { createdAt: { gt: lastLog.startedAt } } : { createdAt: { gte: new Date(0) } },
  take: 15,
  orderBy: { createdAt: 'desc' },
  select: { title: true, company: true, city: true, source: true, createdAt: true },
});

console.log(JSON.stringify({ total, lastScrape: lastLog, newSinceLastScrape: sinceLastScrape, sampleNew: recent }, null, 2));

await db.$disconnect();
