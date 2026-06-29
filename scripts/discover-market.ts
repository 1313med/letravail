/**
 * Market discovery — probe new employers and persist to ATS intelligence DB.
 * Usage: npm run discover:market [--limit=30]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { discoverEmployers } from '../src/platform/employer-discovery.js';
import { MOROCCO_SOURCE_CATALOG, getDiscoverySeeds } from '../src/adapters/source-catalog.js';
import { onboardAndPersist } from '../src/platform/employer-onboarding.js';

const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 30);

const db = getPrisma();
const registered = new Set(MOROCCO_SOURCE_CATALOG.map((c) => c.sourceName));

// Probe catalog employers not yet in intelligence DB
const recentProbes = await db.employerAtsIntelligence.findMany({
  select: { sourceName: true },
  distinct: ['sourceName'],
});
const probed = new Set(recentProbes.map((p) => p.sourceName).filter(Boolean));

const unprobedCatalog = MOROCCO_SOURCE_CATALOG.filter(
  (c) => c.sourceName !== 'linkedin' && c.careerPageUrl && !probed.has(c.sourceName),
).slice(0, limit);

console.log(`Probing ${unprobedCatalog.length} unprobed catalog employers...\n`);
for (const entry of unprobedCatalog) {
  process.stdout.write(`  ${entry.sourceName}... `);
  try {
    const report = await onboardAndPersist(db, entry.careerPageUrl!, {
      sourceName: entry.sourceName,
      companyName: entry.companyName,
    });
    console.log(`${report.atsDetected} [${report.confidence}]`);
  } catch (err) {
    console.log(`FAIL`);
  }
}

console.log(`\nRunning discovery engine (${getDiscoverySeeds().length} seeds)...\n`);
const discovered = await discoverEmployers(db, { persist: true });

const newEmployers = discovered.filter((d) => !d.alreadyRegistered);
const lines = [
  '# Market Discovery Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Catalog probed: ${unprobedCatalog.length}`,
  `Discovery found: ${discovered.length}`,
  `**New (not registered): ${newEmployers.length}**`,
  '',
  '## Recommended Onboarding',
  '',
];

for (const d of newEmployers.slice(0, 25)) {
  lines.push(`- **${d.companyName}** — ${d.atsPlatform} [${d.confidence}] — ${d.careersPageUrl ?? 'no URL'}`);
}

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'market-discovery.md'), lines.join('\n'), 'utf-8');

console.log(lines.join('\n'));
console.log(`\nWritten: reports/market-discovery.md`);

await disconnectPrisma();
