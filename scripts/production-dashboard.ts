/**
 * Production data acquisition dashboard — engineering source health.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import { ProductionDashboardService } from '../src/platform/production-dashboard.service.js';

const { scrapeService, sourceProfileRepo } = getContainer();
await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());

const db = getPrisma();
const dashboard = await new ProductionDashboardService(db).generate();

const lines = [
  '# Production Data Acquisition Dashboard',
  `Generated: ${dashboard.generatedAt}`,
  '',
  '## Database Scale',
  `- Active jobs: **${dashboard.scale.totalActive}**`,
  `- Archived jobs: **${dashboard.scale.totalArchived}**`,
  `- Unique employers: **${dashboard.scale.totalEmployers}**`,
  `- Cities covered: **${dashboard.scale.totalCities}**`,
  '',
  '## Production Status',
  `- Production-ready sources (≥5 jobs, ≥70% rich): **${dashboard.productionReady}**`,
  `- Needs activation (0 jobs / never crawled): **${dashboard.needsActivation}**`,
  `- Broken / maintenance: **${dashboard.broken}**`,
  '',
  '## Source Health Profiles',
  '',
  '| Source | Sector | Status | Active | Rich% | Skills% | Exp% | Quality | Intel | Fresh | ATS | Last Crawl | Next | Issues |',
  '|--------|--------|--------|--------|-------|---------|------|---------|-------|-------|-----|------------|------|--------|',
];

for (const s of dashboard.sources) {
  const issues = s.issues.length > 0 ? s.issues[0] : '—';
  lines.push(
    `| ${s.sourceName} | ${s.sector} | ${s.status} | ${s.activeJobs} | ${s.richDescriptionPct}% | ${s.skillExtractionPct}% | ${s.experienceExtractionPct}% | ${s.avgQualityScore} | ${s.intelligenceScore} | ${s.freshnessScore} | ${s.atsPlatform ?? '—'} | ${s.lastCrawlAt?.slice(0, 16) ?? 'never'} | ${s.nextCrawlAt?.slice(0, 16) ?? '—'} | ${issues} |`,
  );
}

lines.push('', '## Recommendations', '');
for (const r of dashboard.recommendations) {
  lines.push(`- ${r}`);
}

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
const path = join(dir, 'production-dashboard.md');
writeFileSync(path, lines.join('\n'), 'utf-8');

console.log(lines.slice(0, 25).join('\n'));
console.log(`\n... ${dashboard.sources.length} sources total`);
console.log(`Written: ${path}`);

await scrapeService.shutdown();
await disconnectPrisma();
