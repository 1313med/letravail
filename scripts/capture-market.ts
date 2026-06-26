/**
 * Production market capture — crawl priority sources until jobs enter DB.
 * Usage: npm run capture -- [--sector=bpo|banks|telecom] [--limit=N]
 */
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import { MOROCCO_SOURCE_CATALOG } from '../src/adapters/source-catalog.js';
import { mergeDuplicateJobs } from '../src/platform/duplicate-merger.js';

const args = process.argv.slice(2);
const sector = args.find((a) => a.startsWith('--sector='))?.split('=')[1];
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 12);

const PRIORITY_SECTORS = ['bpo', 'banks', 'telecom', 'consulting', 'retail', 'government'];

const db = getPrisma();
const { scrapeService, sourceProfileRepo } = getContainer();
await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());

const before = await db.job.count({ where: { isActive: true } });
console.log(`Active jobs before: ${before}`);

const registry = scrapeService.getRegistry();
const profiles = await db.sourceProfile.findMany();

const targets = registry
  .map((r) => {
    const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === r.sourceName);
    const profile = profiles.find((p) => p.sourceName === r.sourceName);
    return {
      sourceName: r.sourceName,
      sector: catalog?.sector ?? 'unknown',
      priority: catalog?.priority ?? 30,
      activeJobs: profile?.activeJobs ?? 0,
    };
  })
  .filter((t) => t.activeJobs < 5)
  .filter((t) => !sector || t.sector === sector)
  .sort((a, b) => {
    const sectorDiff = PRIORITY_SECTORS.indexOf(a.sector) - PRIORITY_SECTORS.indexOf(b.sector);
    if (sectorDiff !== 0 && a.sector !== b.sector) {
      const ai = PRIORITY_SECTORS.indexOf(a.sector);
      const bi = PRIORITY_SECTORS.indexOf(b.sector);
      if (ai === -1 && bi === -1) return b.priority - a.priority;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return b.priority - a.priority;
  })
  .slice(0, limit);

console.log(`Capturing ${targets.length} sources...\n`);

let totalInserted = 0;
for (const t of targets) {
  process.stdout.write(`→ ${t.sourceName} (${t.sector})... `);
  try {
    const stat = await scrapeService.scrapeSource(t.sourceName);
    totalInserted += stat.jobsInserted;
    console.log(`${stat.jobsFound} found, +${stat.jobsInserted} inserted (${stat.status})`);
  } catch (err) {
    console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
  }
}

const merge = await mergeDuplicateJobs(db);
const after = await db.job.count({ where: { isActive: true } });

console.log(`\nCapture complete:`);
console.log(`  Jobs before: ${before}`);
console.log(`  Jobs after:  ${after} (+${after - before})`);
console.log(`  Inserted this run: ${totalInserted}`);
console.log(`  Duplicates archived: ${merge.archived}`);

await scrapeService.shutdown();
await disconnectPrisma();
