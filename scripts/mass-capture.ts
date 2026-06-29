/**
 * Mass capture — crawl every zero/low-job employer to maximize NEW producing sources.
 * Usage: npm run mass:capture [--limit=40] [--min-jobs=3]
 */
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import { MOROCCO_SOURCE_CATALOG, MISSION_SECTOR_ORDER } from '../src/adapters/source-catalog.js';
import { mergeDuplicateJobs } from '../src/platform/duplicate-merger.js';
import { onboardAndPersist } from '../src/platform/employer-onboarding.js';

const args = process.argv.slice(2);
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 40);
const minJobs = Number(args.find((a) => a.startsWith('--min-jobs='))?.split('=')[1] ?? 3);
const skipProbe = args.includes('--skip-probe');

const db = getPrisma();
const { scrapeService, sourceProfileRepo } = getContainer();
await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());

const jobsBefore = await db.job.count({ where: { isActive: true } });
const producersBefore = await db.job.groupBy({
  by: ['source'],
  where: { isActive: true },
  _count: true,
});
const producingCountBefore = producersBefore.filter((s) => s._count > 0).length;

const profiles = await db.sourceProfile.findMany();
const registry = scrapeService.getRegistry();

const targets = registry
  .map((r) => {
    const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === r.sourceName);
    const profile = profiles.find((p) => p.sourceName === r.sourceName);
    const sector = catalog?.sector ?? 'unknown';
    const sectorRank = MISSION_SECTOR_ORDER.indexOf(sector as typeof MISSION_SECTOR_ORDER[number]);
    return {
      sourceName: r.sourceName,
      category: r.category,
      sector,
      sectorRank: sectorRank === -1 ? 99 : sectorRank,
      priority: catalog?.priority ?? 30,
      activeJobs: profile?.activeJobs ?? 0,
      careerPageUrl: catalog?.careerPageUrl,
      companyName: catalog?.companyName ?? r.sourceName,
    };
  })
  .filter((t) => t.sourceName !== 'linkedin')
  .filter((t) => t.activeJobs < minJobs)
  .sort((a, b) => a.sectorRank - b.sectorRank || b.priority - a.priority)
  .slice(0, limit);

console.log(`Mass capture — ${targets.length} zero/low employers (before: ${jobsBefore} jobs, ${producingCountBefore} producers)\n`);

const results: Array<{ source: string; found: number; inserted: number; status: string }> = [];
let newProducers = 0;

for (const t of targets) {
  if (!skipProbe && t.careerPageUrl) {
    try {
      await onboardAndPersist(db, t.careerPageUrl, {
        sourceName: t.sourceName,
        companyName: t.companyName,
      });
    } catch { /* continue capture */ }
  }

  process.stdout.write(`→ ${t.sourceName} (${t.sector}, ${t.activeJobs} jobs)... `);
  try {
    const stat = await scrapeService.scrapeSource(t.sourceName);
    const wasZero = t.activeJobs === 0;
    const nowProducing = stat.jobsFound > 0 || stat.jobsInserted > 0;
    if (wasZero && nowProducing) newProducers++;
    results.push({
      source: t.sourceName,
      found: stat.jobsFound,
      inserted: stat.jobsInserted,
      status: stat.status,
    });
    console.log(`${stat.jobsFound} found, +${stat.jobsInserted}${wasZero && nowProducing ? ' ★ NEW' : ''}`);
  } catch (err) {
    console.log(`FAIL: ${err instanceof Error ? err.message : err}`);
    results.push({ source: t.sourceName, found: 0, inserted: 0, status: 'failed' });
  }
}

await mergeDuplicateJobs(db);
const jobsAfter = await db.job.count({ where: { isActive: true } });
const producersAfter = await db.job.groupBy({
  by: ['source'],
  where: { isActive: true },
  _count: true,
});
const producingCountAfter = producersAfter.filter((s) => s._count > 0).length;

console.log(`\n═══ MASS CAPTURE SUMMARY ═══`);
console.log(`Jobs:        ${jobsBefore} → ${jobsAfter} (+${jobsAfter - jobsBefore})`);
console.log(`Producers:   ${producingCountBefore} → ${producingCountAfter} (+${producingCountAfter - producingCountBefore})`);
console.log(`New sources: ${newProducers}`);
console.log(`\nTop captures this run:`);
for (const r of results.filter((r) => r.inserted > 0).sort((a, b) => b.inserted - a.inserted).slice(0, 15)) {
  console.log(`  ${r.source}: +${r.inserted} (${r.found} found)`);
}

await scrapeService.shutdown();
await disconnectPrisma();
