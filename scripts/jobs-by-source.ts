import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();

const bySource = await db.job.groupBy({
  by: ['source'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
});

const total = await db.job.count();

console.log(`\nTotal jobs in database: ${total}\n`);
console.log('Jobs per source:');
for (const row of bySource) {
  console.log(`  ${row.source.padEnd(28)} ${row._count.id}`);
}

await db.$disconnect();
