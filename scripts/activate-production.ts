/**
 * Production activation — crawl registered sources that have 0 active jobs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import { MOROCCO_SOURCE_CATALOG } from '../src/adapters/source-catalog.js';

const args = process.argv.slice(2);
const sectorFilter = args.find((a) => a.startsWith('--sector='))?.split('=')[1];
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 15);
const dryRun = args.includes('--dry-run');

const db = getPrisma();
const { scrapeService, sourceProfileRepo } = getContainer();

await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());

const profiles = await db.sourceProfile.findMany();
const zeroJobs = profiles.filter((p) => p.activeJobs === 0 && p.sourceName !== 'linkedin');

const prioritized = zeroJobs
  .map((p) => {
    const catalog = MOROCCO_SOURCE_CATALOG.find((c) => c.sourceName === p.sourceName);
    return { profile: p, priority: catalog?.priority ?? 30, sector: catalog?.sector ?? 'unknown' };
  })
  .filter((x) => !sectorFilter || x.sector === sectorFilter)
  .sort((a, b) => b.priority - a.priority)
  .slice(0, limit);

console.log(`Production activation: ${prioritized.length} sources (dry-run=${dryRun})`);

const results: Array<{
  source: string;
  status: string;
  jobsFound: number;
  inserted: number;
  durationMs: number;
  error?: string;
}> = [];

for (const { profile } of prioritized) {
  console.log(`\n→ Activating: ${profile.sourceName}`);
  if (dryRun) {
    results.push({ source: profile.sourceName, status: 'skipped', jobsFound: 0, inserted: 0, durationMs: 0 });
    continue;
  }

  try {
    const stat = await scrapeService.scrapeSource(profile.sourceName);
    results.push({
      source: profile.sourceName,
      status: stat.status,
      jobsFound: stat.jobsFound,
      inserted: stat.jobsInserted,
      durationMs: stat.durationMs,
      error: stat.errorMessage,
    });
    console.log(`  ✓ ${stat.jobsFound} found, ${stat.jobsInserted} inserted (${stat.status})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ source: profile.sourceName, status: 'failed', jobsFound: 0, inserted: 0, durationMs: 0, error: msg });
    console.log(`  ✗ ${msg}`);
  }
}

const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
const totalFound = results.reduce((a, r) => a + r.jobsFound, 0);
const succeeded = results.filter((r) => r.status === 'success' || r.jobsFound > 0).length;

const lines = [
  '# Production Activation Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Sources attempted: ${results.length}`,
  `Succeeded: ${succeeded}`,
  `Total jobs found: ${totalFound}`,
  `Total inserted: ${totalInserted}`,
  '',
  '| Source | Status | Found | Inserted | Duration |',
  '|--------|--------|-------|----------|----------|',
  ...results.map((r) => `| ${r.source} | ${r.status} | ${r.jobsFound} | ${r.inserted} | ${r.durationMs}ms |`),
];

const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'production-activation-report.md'), lines.join('\n'), 'utf-8');

console.log(`\nActivation complete: +${totalInserted} jobs from ${succeeded}/${results.length} sources`);
console.log('Report: reports/production-activation-report.md');

await scrapeService.shutdown();
await disconnectPrisma();
