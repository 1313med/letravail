import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { generateMarketCoverage } from '../src/platform/coverage-intelligence.js';

const db = getPrisma();
const report = await generateMarketCoverage(db);

const lines = [
  '# Market Coverage Intelligence Report',
  `Generated: ${report.generatedAt}`,
  '',
  '## Overall',
  `- Active jobs captured: **${report.totalActiveJobs}**`,
  `- Estimated market (monthly): **${report.totalEstimatedMarket}**`,
  `- Overall coverage index: **${report.overallCoveragePercent}%**`,
  '',
  '## Coverage by Sector',
  '',
  '| Sector | Est. Market | Captured | Coverage | Sources Active/Total |',
  '|--------|-------------|----------|----------|---------------------|',
];

for (const s of report.sectors) {
  lines.push(`| ${s.sector} | ${s.estimatedMonthlyJobs} | ${s.capturedActiveJobs} | **${s.coveragePercent}%** | ${s.sourcesActive}/${s.sourcesTotal} |`);
}

lines.push('', '## Coverage by City', '', '| City | Jobs | Share | Employers |', '|------|------|-------|-----------|');
for (const c of report.cities.slice(0, 15)) {
  lines.push(`| ${c.city} | ${c.activeJobs} | ${c.sharePercent}% | ${c.employers} |`);
}

lines.push('', '## Top Employers', '');
for (const e of report.employers.slice(0, 15)) {
  lines.push(`- **${e.company}**: ${e.jobs} jobs (${e.sources.join(', ')})`);
}

lines.push('', '## Top Professions', '');
for (const p of report.professions.slice(0, 15)) {
  lines.push(`- ${p.title}: ${p.count}`);
}

if (report.gaps.length > 0) {
  lines.push('', '## Coverage Gaps (Roadmap)', '');
  for (const g of report.gaps) lines.push(`- ${g}`);
}

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'market-coverage-report.md'), lines.join('\n'), 'utf-8');
console.log('Wrote reports/market-coverage-report.md');

await disconnectPrisma();
