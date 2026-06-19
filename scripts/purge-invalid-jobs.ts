import { getPrisma } from '../src/lib/prisma.js';
import { isLikelyJobPosting } from '../src/utils/job-filters.js';

const db = getPrisma();
const jobs = await db.job.findMany({ select: { id: true, title: true, applicationUrl: true, source: true } });

const invalid = jobs.filter((j) => !isLikelyJobPosting(j.title, j.applicationUrl));
console.log(`Found ${invalid.length} invalid / ${jobs.length} total jobs`);

if (invalid.length > 0) {
  await db.jobTag.deleteMany({ where: { jobId: { in: invalid.map((j) => j.id) } } });
  await db.job.deleteMany({ where: { id: { in: invalid.map((j) => j.id) } } });
  console.log(`Deleted ${invalid.length} invalid jobs`);
}

await db.$disconnect();
