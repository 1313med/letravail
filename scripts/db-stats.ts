import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const active = await db.job.count({ where: { isActive: true } });
const bySource = await db.job.groupBy({
  by: ['source'],
  where: { isActive: true },
  _count: true,
  orderBy: { _count: { source: 'desc' } },
});
const producing = bySource.filter((s) => s._count > 0).length;

console.log(`Active jobs: ${active}`);
console.log(`Producing sources: ${producing}`);
for (const s of bySource) {
  console.log(`  ${s.source}: ${s._count}`);
}

await disconnectPrisma();
