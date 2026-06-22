import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const since = new Date('2026-06-21T12:00:00.000Z'); // will use scrape start from args or recent

const scrapeStart = process.argv[2] ? new Date(process.argv[2]) : new Date(Date.now() - 30 * 60 * 1000);

const beforeTotal = 473; // from pre-scrape check
const total = await db.job.count();
const newJobs = await db.job.findMany({
  where: { createdAt: { gte: scrapeStart } },
  orderBy: { createdAt: 'desc' },
  select: {
    title: true,
    company: true,
    city: true,
    source: true,
    createdAt: true,
    slug: true,
  },
});

const bySource = await db.scrapeLog.groupBy({
  by: ['source'],
  where: { startedAt: { gte: scrapeStart } },
  _sum: { jobsFound: true, jobsInserted: true, jobsUpdated: true, duplicates: true },
  orderBy: { source: 'asc' },
});

const totals = bySource.reduce(
  (acc, r) => ({
    jobsFound: acc.jobsFound + (r._sum.jobsFound ?? 0),
    jobsInserted: acc.jobsInserted + (r._sum.jobsInserted ?? 0),
    jobsUpdated: acc.jobsUpdated + (r._sum.jobsUpdated ?? 0),
    duplicates: acc.duplicates + (r._sum.duplicates ?? 0),
  }),
  { jobsFound: 0, jobsInserted: 0, jobsUpdated: 0, duplicates: 0 },
);

console.log('\n=== Scrape comparison ===');
console.log(`Jobs in DB before: ${beforeTotal}`);
console.log(`Jobs in DB now:    ${total}`);
console.log(`Net new rows:      ${total - beforeTotal}`);
console.log('\nThis run totals:', totals);
console.log(`\nNew jobs inserted (createdAt since run): ${newJobs.length}`);
if (newJobs.length > 0) {
  console.log('\nNew offers:');
  for (const j of newJobs.slice(0, 25)) {
    console.log(`  • [${j.source}] ${j.title} — ${j.company}, ${j.city}`);
  }
  if (newJobs.length > 25) console.log(`  … and ${newJobs.length - 25} more`);
}

const updatedOnly = totals.jobsUpdated;
console.log(`\nExisting offers refreshed (updated, not new): ${updatedOnly}`);
console.log(`Already known (duplicates skipped as new): ${totals.duplicates}`);

await db.$disconnect();
