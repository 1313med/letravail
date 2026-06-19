import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const count = await db.job.count();
const sample = await db.job.findMany({
  take: 5,
  select: {
    title: true,
    city: true,
    company: true,
    source: true,
    slug: true,
    publishedAt: true,
    applicationUrl: true,
  },
  orderBy: { createdAt: 'desc' },
});

console.log('Total jobs:', count);
console.log(JSON.stringify(sample, null, 2));

await db.$disconnect();
