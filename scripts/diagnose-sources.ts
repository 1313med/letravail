/**
 * Diagnostic: LinkedIn pipeline + Attijariwafa skill extraction audit
 */
import { existsSync } from 'node:fs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';
import { extractSkills } from '../src/enrichment/skill-extractor.js';
import { getLinkedInStoragePath } from '../src/scrapers/linkedin/session.js';
import { config } from '../src/config/index.js';

const db = getPrisma();
const REPORT_DIR = join(process.cwd(), 'reports');

async function main(): Promise<void> {
  mkdirSync(REPORT_DIR, { recursive: true });
  const lines: string[] = ['# Source Diagnostics Report', `Generated: ${new Date().toISOString()}`, ''];

  // LinkedIn DB audit
  const linkedinJobs = await db.job.findMany({
    where: { source: 'linkedin' },
    select: { title: true, description: true, rawHtml: true, qualityScore: true },
  });
  const liAvg = linkedinJobs.length
    ? Math.round(linkedinJobs.reduce((a, j) => a + j.description.length, 0) / linkedinJobs.length)
    : 0;
  const liTitleOnly = linkedinJobs.filter((j) => j.description.trim() === j.title.trim()).length;
  const liWithHtml = linkedinJobs.filter((j) => j.rawHtml && j.rawHtml.length > 100).length;

  lines.push('## LinkedIn Database State');
  lines.push(`- Jobs in DB: ${linkedinJobs.length}`);
  lines.push(`- Avg description length: ${liAvg}`);
  lines.push(`- Description = title: ${liTitleOnly} (${pct(liTitleOnly, linkedinJobs.length)})`);
  lines.push(`- Has rawHtml: ${liWithHtml}`);
  lines.push(`- Auth file exists: ${existsSync(getLinkedInStoragePath())}`);
  lines.push(`- LINKEDIN_DETAIL_FETCH_LIMIT: ${config.linkedinDetailFetchLimit}`);
  lines.push(`- LINKEDIN_MAX_JOBS: ${config.linkedinMaxJobs}`);
  lines.push('');

  // Attijariwafa skill audit (20 jobs)
  const attJobs = await db.job.findMany({
    where: { source: 'attijariwafa-bank' },
    take: 20,
    select: { id: true, title: true, description: true },
  });

  lines.push('## Attijariwafa Skill Audit (20 jobs)');
  let attWithSkills = 0;
  for (const job of attJobs) {
    const skills = extractSkills(`${job.title}\n${job.description}`);
    if (skills.length > 0) attWithSkills++;
    lines.push(`### ${job.title}`);
    lines.push(`- Description length: ${job.description.length}`);
    lines.push(`- Skills found: ${skills.map((s) => s.name).join(', ') || '**NONE**'}`);
    lines.push(`- Sample: ${job.description.slice(0, 200).replace(/\n/g, ' ')}...`);
    lines.push('');
  }
  lines.push(`**Attijariwafa skill hit rate (sample):** ${attWithSkills}/${attJobs.length}`);
  lines.push('');

  // CIH baseline
  const cihCount = await db.job.count({ where: { source: 'cih-bank' } });
  const cihWithSkills = await db.job.count({
    where: { source: 'cih-bank', skills: { some: {} } },
  });
  lines.push('## CIH Skill Baseline');
  lines.push(`- Jobs: ${cihCount}, with skills: ${cihWithSkills} (${pct(cihWithSkills, cihCount)})`);
  lines.push('');

  const reportPath = join(REPORT_DIR, 'source-diagnostics.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(lines.join('\n'));
  console.log(`\nWritten: ${reportPath}`);

  await db.$disconnect();
}

function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
