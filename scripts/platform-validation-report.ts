import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';
import { findCrossSourceDuplicates } from '../src/platform/duplicate-detector.js';

const db = getPrisma();
const now = new Date();
const dayAgo = new Date(now.getTime() - 86_400_000);

const total = await db.job.count({ where: { isActive: true } });
const newToday = await db.job.count({ where: { firstSeenAt: { gte: dayAgo } } });
const archivedToday = await db.job.count({ where: { archivedAt: { gte: dayAgo } } });
const editedToday = await db.jobVersion.count({ where: { capturedAt: { gte: dayAgo } } });

const sources = await db.sourceProfile.findMany({ where: { status: 'active' }, orderBy: { intelligenceScore: 'desc' } });
const dupes = await findCrossSourceDuplicates(db, 30);

const avgQuality = await db.job.aggregate({ where: { isActive: true }, _avg: { qualityScore: true } });
const withSkills = await db.job.count({ where: { isActive: true, skills: { some: {} } } });
const richDesc = await db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM jobs WHERE "isActive" = true AND LENGTH(description) >= 500`;
const employers = await db.job.groupBy({ by: ['company'], where: { isActive: true }, _count: { id: true } });
const cities = await db.job.groupBy({ by: ['city'], where: { isActive: true }, _count: { id: true } });

const lines = [
  '# Platform Validation Report',
  `Generated: ${now.toISOString()}`,
  '',
  '## Daily Metrics',
  `- Active jobs: **${total}**`,
  `- New today: **${newToday}**`,
  `- Archived today: **${archivedToday}**`,
  `- Content edits detected: **${editedToday}**`,
  `- Avg quality score: **${(avgQuality._avg.qualityScore ?? 0).toFixed(1)}**`,
  `- Skill coverage: **${total > 0 ? ((withSkills / total) * 100).toFixed(1) : 0}%**`,
  `- Rich descriptions: **${total > 0 ? ((Number(richDesc[0]?.count ?? 0) / total) * 100).toFixed(1) : 0}%**`,
  `- Unique employers: **${employers.length}**`,
  `- Cities covered: **${cities.length}**`,
  `- Cross-source duplicates flagged: **${dupes.length}**`,
  '',
  '## Source Health',
  '',
  '| Source | Status | Active | Intelligence | Freshness | Avg Desc |',
  '|--------|--------|--------|--------------|-----------|----------|',
];

for (const s of sources.slice(0, 30)) {
  lines.push(`| ${s.sourceName} | ${s.status} | ${s.activeJobs} | ${s.intelligenceScore ?? '—'} | ${s.freshnessScore ?? '—'} | ${s.avgDescriptionLength ?? '—'} |`);
}

if (dupes.length > 0) {
  lines.push('', '## Cross-Source Duplicates (sample)', '');
  for (const d of dupes.slice(0, 10)) {
    lines.push(`- ${d.title} @ ${d.company} (${d.source} → ${d.duplicateOfSource})`);
  }
}

const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'platform-validation-report.md'), lines.join('\n'), 'utf-8');
console.log('Wrote reports/platform-validation-report.md');

await db.$disconnect();
