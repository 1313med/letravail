import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';

const db = getPrisma();

const total = await db.employerAtsIntelligence.count();
const byAts = await db.employerAtsIntelligence.groupBy({
  by: ['atsPlatform'],
  _count: true,
  orderBy: { _count: { atsPlatform: 'desc' } },
});
const ready = await db.employerAtsIntelligence.count({ where: { activationState: { in: ['READY', 'VALIDATED'] } } });
const active = await db.employerAtsIntelligence.count({ where: { activationState: { in: ['ACTIVE', 'MONITORED'] } } });
const byActivation = await db.employerAtsIntelligence.groupBy({
  by: ['activationState'],
  _count: true,
});
const highConfidence = await db.employerAtsIntelligence.count({ where: { confidence: { gte: 70 } } });

console.log(`ATS Intelligence Database: ${total} probes`);
console.log(`  Ready for activation: ${ready}`);
console.log(`  Active/Monitored: ${active}`);
console.log(`  High confidence (≥70): ${highConfidence}`);
console.log('\nBy activation state:');
for (const row of byActivation) {
  console.log(`  ${row.activationState}: ${row._count}`);
}
console.log('\nBy ATS platform:');
for (const row of byAts) {
  console.log(`  ${row.atsPlatform}: ${row._count}`);
}

const recent = await db.employerAtsIntelligence.findMany({
  orderBy: { probedAt: 'desc' },
  take: 10,
  select: {
    companyName: true,
    sourceName: true,
    atsPlatform: true,
    confidence: true,
    crawlStrategy: true,
    careersPageUrl: true,
  },
});

console.log('\nRecent probes:');
for (const r of recent) {
  console.log(`  ${r.companyName} (${r.sourceName ?? '—'}) → ${r.atsPlatform} [${r.confidence}] ${r.crawlStrategy}`);
}

await disconnectPrisma();
