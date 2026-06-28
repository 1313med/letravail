/**
 * Batch-probe catalog employers into ATS intelligence database.
 * Usage: npm run probe:catalog [-- --sector=bpo] [-- --limit=20] [-- --force]
 */
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { MOROCCO_SOURCE_CATALOG } from '../src/adapters/source-catalog.js';
import { onboardAndPersist } from '../src/platform/employer-onboarding.js';
import { AtsIntelligenceRepository } from '../src/repositories/ats-intelligence.repository.js';
import { refreshAllPriorities } from '../src/platform/source-priority-engine.js';

const args = process.argv.slice(2);
const sector = args.find((a) => a.startsWith('--sector='))?.split('=')[1];
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 25);
const force = args.includes('--force');

const db = getPrisma();
const repo = new AtsIntelligenceRepository(db);

let targets = MOROCCO_SOURCE_CATALOG.filter((c) => c.status !== 'planned' || c.careerPageUrl);
if (sector) targets = targets.filter((c) => c.sector === sector);

if (!force) {
  targets = await repo.getUnprobedCatalogSources(targets, 14);
}

targets = targets
  .sort((a, b) => b.priority - a.priority)
  .slice(0, limit);

console.log(`Probing ${targets.length} employers...\n`);

let probed = 0;
let ready = 0;

for (const entry of targets) {
  const url = entry.careerPageUrl ?? guessUrl(entry.companyName);
  process.stdout.write(`→ ${entry.sourceName} (${entry.sector})... `);

  try {
    const report = await onboardAndPersist(db, url, {
      companyName: entry.companyName,
      sourceName: entry.sourceName,
    });
    probed++;
    if (report.confidenceScore >= 70) ready++;
    console.log(
      `${report.atsDetected} | confidence ${report.confidenceScore} | ${report.crawlStrategy} | ${report.careersPageUrl ?? 'no careers URL'}`,
    );
  } catch (err) {
    console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
  }

  await sleep(400);
}

const priorities = await refreshAllPriorities(db);

console.log(`\nProbe complete: ${probed} probed, ${ready} ready for activation`);
console.log(`Top priority sources:`);
for (const p of priorities.slice(0, 8)) {
  console.log(`  ${p.sourceName}: ${p.priorityScore} (${p.tier}, ${p.recommendedIntervalMinutes}min)`);
}

await disconnectPrisma();

function guessUrl(companyName: string): string {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `https://www.${slug}.ma`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
