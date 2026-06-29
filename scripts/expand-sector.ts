/**
 * Mission 1 — Sector expansion pipeline.
 * Probe → validate → activate → capture for a priority sector.
 * Usage: npm run expand -- [--sector=banks] [--limit=10] [--skip-capture]
 */
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import {
  MISSION_SECTOR_ORDER,
  getSourcesBySector,
  MOROCCO_SOURCE_CATALOG,
} from '../src/adapters/source-catalog.js';
import { onboardAndPersist } from '../src/platform/employer-onboarding.js';
import { EmployerActivationEngine } from '../src/platform/employer-activation-engine.js';
import { mergeDuplicateJobs } from '../src/platform/duplicate-merger.js';
import { refreshAllPriorities } from '../src/platform/source-priority-engine.js';

const args = process.argv.slice(2);
const sectorArg = args.find((a) => a.startsWith('--sector='))?.split('=')[1];
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const skipCapture = args.includes('--skip-capture');
const force = args.includes('--force');

const db = getPrisma();
const { scrapeService, sourceProfileRepo } = getContainer();
await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());

const sectors = sectorArg ? [sectorArg] : [...MISSION_SECTOR_ORDER];
const jobsBefore = await db.job.count({ where: { isActive: true } });
const engine = new EmployerActivationEngine(db, scrapeService);

console.log(`Mission expansion — ${jobsBefore} active jobs\n`);

for (const sector of sectors) {
  const catalog = getSourcesBySector(sector)
    .filter((c) => c.status === 'active' || c.careerPageUrl)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  if (catalog.length === 0) continue;

  console.log(`\n═══ ${sector.toUpperCase()} (${catalog.length} employers) ═══`);

  for (const entry of catalog) {
    const url = entry.careerPageUrl ?? `https://www.${entry.sourceName}.ma`;
    process.stdout.write(`  probe ${entry.sourceName}... `);
    try {
      const report = await onboardAndPersist(db, url, {
        companyName: entry.companyName,
        sourceName: entry.sourceName,
      });
      console.log(`${report.atsDetected} [${report.confidence}]`);
    } catch (err) {
      console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(300);
  }

  console.log(`  validate...`);
  const validations = await engine.runValidationCrawls(limit);
  const activated = validations.filter((d) => d.decision === 'ACTIVATED').length;
  console.log(`  → ${activated} activated, ${validations.length} evaluated`);

  if (!skipCapture) {
    const registry = scrapeService.getRegistry();
    const profiles = await db.sourceProfile.findMany();
    const targets = catalog
      .map((c) => c.sourceName)
      .filter((name) => registry.some((r) => r.sourceName === name))
      .filter((name) => {
        const p = profiles.find((x) => x.sourceName === name);
        return (p?.activeJobs ?? 0) < 20;
      });

    for (const sourceName of targets) {
      process.stdout.write(`  capture ${sourceName}... `);
      try {
        const stat = await scrapeService.scrapeSource(sourceName);
        console.log(`${stat.jobsFound} found, +${stat.jobsInserted}`);
      } catch (err) {
        console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

await mergeDuplicateJobs(db);
await refreshAllPriorities(db);
const jobsAfter = await db.job.count({ where: { isActive: true } });
const producing = await db.job.groupBy({
  by: ['source'],
  where: { isActive: true },
  _count: true,
});

console.log(`\n═══ EXPANSION COMPLETE ═══`);
console.log(`Jobs: ${jobsBefore} → ${jobsAfter} (+${jobsAfter - jobsBefore})`);
console.log(`Producing sources: ${producing.filter((s) => s._count > 0).length}`);
for (const s of producing.sort((a, b) => b._count - a._count).slice(0, 12)) {
  console.log(`  ${s.source}: ${s._count}`);
}

const metrics = await engine.getMetrics();
console.log(`\nActivation states:`, metrics.byState);

await scrapeService.shutdown();
await disconnectPrisma();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
