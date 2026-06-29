/**
 * Mission 9 — ATS Platform Mastery report.
 * Usage: npm run ats:mastery [--seed] [--roi]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { AtsPlatformRepository } from '../src/repositories/ats-platform.repository.js';
import { computePlatformMetrics } from '../src/platform/ats-metrics-engine.js';
import { computeAtsRoi } from '../src/platform/ats-roi-engine.js';
import { formatInvestigationReason } from '../src/platform/ats-failure-classifier.js';

const args = process.argv.slice(2);
const shouldSeed = args.includes('--seed') || !args.includes('--no-seed');

const db = getPrisma();
const repo = new AtsPlatformRepository(db);

if (shouldSeed) {
  const n = await repo.seedProfiles();
  console.log(`Seeded ${n} ATS platform profiles\n`);
}

const metrics = await computePlatformMetrics(db);
await repo.updateMetrics(metrics);

const roi = computeAtsRoi(metrics);
await repo.updateRoiScores(roi.map((r) => ({ platform: r.platform, roiScore: r.roiScore })));

const platforms = await repo.listAll();
const investigation = await repo.getInvestigationSummary();

console.log('═══ ATS PLATFORM MASTERY ═══\n');
console.log('Platform metrics (live):');
console.log(
  'Platform'.padEnd(22) +
    'Employers'.padStart(10) +
    'Active'.padStart(8) +
    'Jobs'.padStart(8) +
    'Success%'.padStart(10) +
    'Avg ms'.padStart(8) +
    'Quality'.padStart(8),
);
console.log('─'.repeat(74));

for (const p of platforms.sort((a, b) => (b.roiScore ?? 0) - (a.roiScore ?? 0))) {
  console.log(
    p.displayName.padEnd(22) +
      String(p.employerCount).padStart(10) +
      String(p.activeEmployerCount).padStart(8) +
      String(p.jobsCaptured).padStart(8) +
      `${Math.round((p.successRate ?? 0) * 100)}%`.padStart(10) +
      String(p.avgCrawlDurationMs ?? 0).padStart(8) +
      String(p.avgQualityScore ?? 0).padStart(8),
  );
}

console.log('\n═══ ROI ENGINE — Engineering Priority ═══\n');
for (const r of roi.slice(0, 8)) {
  console.log(`#${roi.indexOf(r) + 1} ${r.displayName} (ROI ${r.roiScore})`);
  console.log(
    `   Active: ${r.activeEmployers}/${r.registeredEmployers} | Jobs: ${r.currentJobs} | Unlockable: ~${r.estimatedJobsUnlockable}`,
  );
  console.log(`   → ${r.recommendation}\n`);
}

if (investigation.reasonCounts.size > 0) {
  console.log('═══ CUSTOM / UNKNOWN Investigation ═══\n');
  for (const [reason, count] of [...investigation.reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${formatInvestigationReason(reason as Parameters<typeof formatInvestigationReason>[0])}: ${count}`);
  }
  console.log('');
  for (const e of investigation.employers.filter((x) => x.investigationReasons.length > 0).slice(0, 8)) {
    console.log(
      `  ${e.companyName} (${e.atsPlatform}): ${e.investigationReasons.map((r) => formatInvestigationReason(r as Parameters<typeof formatInvestigationReason>[0])).join(', ')}`,
    );
  }
}

const lines = [
  '# ATS Platform Mastery Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## ROI Priority',
  '',
  '| Rank | Platform | ROI | Active | Jobs | Unlockable | Recommendation |',
  '|------|----------|-----|--------|------|------------|----------------|',
  ...roi.map(
    (r, i) =>
      `| ${i + 1} | ${r.displayName} | ${r.roiScore} | ${r.activeEmployers}/${r.registeredEmployers} | ${r.currentJobs} | ~${r.estimatedJobsUnlockable} | ${r.recommendation} |`,
  ),
  '',
  '## Platform Metrics',
  '',
  '| Platform | Employers | Active | Jobs | Success% | Avg crawl ms | Quality |',
  '|----------|-----------|--------|------|----------|--------------|---------|',
  ...platforms.map(
    (p) =>
      `| ${p.displayName} | ${p.employerCount} | ${p.activeEmployerCount} | ${p.jobsCaptured} | ${Math.round((p.successRate ?? 0) * 100)}% | ${p.avgCrawlDurationMs ?? 0} | ${p.avgQualityScore ?? 0} |`,
  ),
];

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ats-mastery.md'), lines.join('\n'), 'utf-8');
console.log(`\nWritten: reports/ats-mastery.md`);

await disconnectPrisma();
