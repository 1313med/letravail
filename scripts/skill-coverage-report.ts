/**
 * Skill Coverage Report — before/after comparison on live DB data.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';
import { extractSkills, measureSkillCoverage } from '../src/enrichment/skill-extractor.js';

const db = getPrisma();
const REPORT_DIR = join(process.cwd(), 'reports');

async function main(): Promise<void> {
  mkdirSync(REPORT_DIR, { recursive: true });

  const jobs = await db.job.findMany({
    select: { source: true, title: true, description: true, skills: { select: { skillId: true } } },
  });

  const extraction = measureSkillCoverage(jobs);
  const dbWithSkills = jobs.filter((j) => j.skills.length > 0).length;

  const bySource = new Map<string, typeof jobs>();
  for (const j of jobs) {
    const list = bySource.get(j.source) ?? [];
    list.push(j);
    bySource.set(j.source, list);
  }

  const topSkills = [...extraction.skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  const lines = [
    '# Skill Coverage Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Overall',
    `- Total jobs: ${jobs.length}`,
    `- Extraction engine coverage: **${pct(extraction.withSkills, extraction.total)}** (${extraction.withSkills}/${extraction.total})`,
    `- DB job_skills links: **${pct(dbWithSkills, jobs.length)}** (${dbWithSkills}/${jobs.length})`,
    `- Target: 40–60%`,
    '',
    '## By Source (extraction engine on current descriptions)',
    '| Source | Jobs | With Skills | Coverage |',
    '|--------|------|-------------|----------|',
    ...[...bySource.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([source, list]) => {
        const m = measureSkillCoverage(list);
        return `| ${source} | ${list.length} | ${m.withSkills} | ${pct(m.withSkills, list.length)} |`;
      }),
    '',
    '## Top Extracted Skills',
    '| Skill | Jobs |',
    '|-------|------|',
    ...topSkills.map(([slug, count]) => `| ${slug} | ${count} |`),
    '',
    '## Attijariwafa Sample (post engine redesign)',
  ];

  const att = jobs.filter((j) => j.source === 'attijariwafa-bank').slice(0, 10);
  for (const job of att) {
    const skills = extractSkills(`${job.title}\n${job.description}`);
    lines.push(`- **${job.title}**: ${skills.map((s) => s.name).join(', ') || 'none'}`);
  }

  const path = join(REPORT_DIR, 'skill-coverage-report.md');
  writeFileSync(path, lines.join('\n'), 'utf-8');
  console.log(lines.join('\n'));
  console.log(`\nWritten: ${path}`);

  await db.$disconnect();
}

function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
