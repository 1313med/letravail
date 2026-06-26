/**
 * Platform dashboard — employment data acquisition health report.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getContainer } from '../src/container.js';
import { disconnectPrisma } from '../src/lib/prisma.js';

async function main(): Promise<void> {
  const { qualityDashboard, sourceProfileRepo, companyAliasRepo, scrapeService } = getContainer();

  await sourceProfileRepo.syncFromRegistry(scrapeService.getRegistry());
  const seeded = await companyAliasRepo.seedCanonicalAliases();
  const dashboard = await qualityDashboard.generate();

  const lines = [
    '# Letravail Employment Data Platform — Dashboard',
    `Generated: ${dashboard.generatedAt}`,
    '',
    '## Database Scale',
    `- Total jobs: **${dashboard.jobs.total}** (active: ${dashboard.jobs.active}, archived: ${dashboard.jobs.archived})`,
    `- Companies: **${dashboard.companies.total}** (enriched: ${dashboard.companies.enriched})`,
    `- Company aliases seeded: ${seeded}`,
    '',
    '## Quality Metrics',
    `- Avg job quality score: **${dashboard.quality.avgJobQuality}/100**`,
    `- Avg description length: **${dashboard.quality.avgDescriptionLength}** chars`,
    `- Skill coverage: **${(dashboard.quality.skillCoverage * 100).toFixed(1)}%**`,
    `- Company enrichment: **${(dashboard.quality.companyEnrichment * 100).toFixed(1)}%**`,
    '',
    '## Source Intelligence',
    '| Source | Status | Active Jobs | Intelligence | Freshness | Skills | Avg Desc | Next Crawl |',
    '|--------|--------|-------------|--------------|-----------|--------|----------|------------|',
    ...dashboard.sources.map((s) =>
      `| ${s.sourceName} | ${s.status} | ${s.activeJobs} | ${s.intelligenceScore?.toFixed(0) ?? '—'} | ${s.freshnessScore?.toFixed(0) ?? '—'} | ${s.skillCoverage ? `${(s.skillCoverage * 100).toFixed(0)}%` : '—'} | ${s.avgDescriptionLength ?? '—'} | ${s.nextCrawlAt?.slice(0, 16) ?? '—'} |`,
    ),
    '',
    '## Recommendations',
    ...dashboard.recommendations.map((r) => `- ${r}`),
  ];

  const dir = join(process.cwd(), 'reports');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'platform-dashboard.md');
  writeFileSync(path, lines.join('\n'), 'utf-8');

  console.log(lines.join('\n'));
  console.log(`\nWritten: ${path}`);

  await disconnectPrisma();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
