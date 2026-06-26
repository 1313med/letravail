import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';
import { MOROCCO_SOURCE_CATALOG } from '../src/adapters/source-catalog.js';
import { detectAtsFromUrls } from '../src/adapters/ats-registry.js';

const db = getPrisma();

const profiles = await db.sourceProfile.findMany({ orderBy: { intelligenceScore: 'desc' } });
const registrySources = new Set(profiles.map((p) => p.sourceName));

const lines = [
  '# Source Expansion Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## New Employers Integrated (Sprint 2)',
  '',
  '| Employer | Status | ATS | Active Jobs | Avg Desc | Intelligence | Crawl Interval |',
  '|----------|--------|-----|-------------|----------|--------------|----------------|',
];

const bpoSources = MOROCCO_SOURCE_CATALOG.filter((s) => s.sector === 'bpo');
for (const entry of bpoSources) {
  const profile = profiles.find((p) => p.sourceName === entry.sourceName);
  const ats = entry.atsPlatform ?? (entry.careerPageUrl ? detectAtsFromUrls([entry.careerPageUrl]) : 'custom');
  const inRegistry = registrySources.has(entry.sourceName);
  lines.push(
    `| ${entry.companyName} | ${inRegistry ? entry.status : 'not registered'} | ${ats} | ${profile?.activeJobs ?? 0} | ${profile?.avgDescriptionLength ?? 0} | ${profile?.intelligenceScore ?? '—'} | ${profile?.crawlIntervalMinutes ?? '—'} min |`,
  );
}

lines.push('', '## Crawl Success (last run per source)', '');
for (const p of profiles.filter((pr) => bpoSources.some((b) => b.sourceName === pr.sourceName))) {
  const lastLog = await db.scrapeLog.findFirst({
    where: { source: p.sourceName },
    orderBy: { startedAt: 'desc' },
  });
  lines.push(
    `- **${p.sourceName}**: ${lastLog?.status ?? 'never crawled'}, discovered ${lastLog?.jobsFound ?? 0}, inserted ${lastLog?.jobsInserted ?? 0}`,
  );
}

lines.push('', '## Recommendations', '');
for (const entry of bpoSources.filter((s) => s.status === 'active')) {
  const profile = profiles.find((p) => p.sourceName === entry.sourceName);
  const freq = profile?.crawlIntervalMinutes
    ? `every ${profile.crawlIntervalMinutes} min`
    : 'every 6h (default)';
  lines.push(`- **${entry.companyName}**: ~${entry.estimatedMonthlyJobs} jobs/month, crawl ${freq}`);
}

const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'source-expansion-report.md'), lines.join('\n'), 'utf-8');
console.log('Wrote reports/source-expansion-report.md');

await db.$disconnect();
