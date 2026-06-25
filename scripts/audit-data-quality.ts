/**
 * Employment Intelligence Data Quality Audit
 * Generates all 9 deliverable reports from live PostgreSQL data.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const REPORT_DIR = join(process.cwd(), 'reports');
const DESC_TARGET = 500;

interface SourceRow {
  source: string;
  jobs: number;
  avgDescLen: number;
  avgTitleLen: number;
  descEqualsTitle: number;
  descOver500: number;
  hasRequirements: number;
  hasContract: number;
  hasSalary: number;
  hasExperience: number;
  hasEducation: number;
  hasSkills: number;
  hasRawHtml: number;
  avgQuality: number | null;
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function classifySource(row: SourceRow): 'HEALTHY' | 'PARTIAL' | 'BROKEN' {
  const completeness = row.jobs > 0 ? row.descOver500 / row.jobs : 0;
  if (completeness >= 0.7 && row.avgDescLen >= DESC_TARGET) return 'HEALTHY';
  if (completeness >= 0.3 || row.avgDescLen >= 200) return 'PARTIAL';
  return 'BROKEN';
}

async function main(): Promise<void> {
  mkdirSync(REPORT_DIR, { recursive: true });

  const jobs = await db.job.findMany({
    select: {
      id: true,
      source: true,
      title: true,
      description: true,
      requirements: true,
      salary: true,
      contractType: true,
      experienceLevel: true,
      experienceYears: true,
      educationLevel: true,
      rawHtml: true,
      qualityScore: true,
      descriptionScore: true,
      companyId: true,
      locationId: true,
      companyRef: {
        select: {
          websiteUrl: true,
          logoUrl: true,
          industry: true,
          size: true,
          careerPageUrl: true,
          linkedinUrl: true,
        },
      },
      location: {
        select: { region: true, canonicalCity: true },
      },
      skills: { select: { skillId: true } },
    },
  });

  const total = jobs.length;
  const bySource = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const list = bySource.get(job.source) ?? [];
    list.push(job);
    bySource.set(job.source, list);
  }

  const sourceRows: SourceRow[] = [...bySource.entries()]
    .map(([source, list]) => {
      const descLens = list.map((j) => j.description.length);
      const avgDescLen = descLens.reduce((a, b) => a + b, 0) / list.length;
      const avgTitleLen = list.reduce((a, j) => a + j.title.length, 0) / list.length;
      const descEqualsTitle = list.filter((j) => j.description.trim() === j.title.trim()).length;
      const descOver500 = list.filter((j) => j.description.length >= DESC_TARGET).length;
      const hasRequirements = list.filter((j) => j.requirements && j.requirements.length > 20).length;
      const hasContract = list.filter((j) => j.contractType).length;
      const hasSalary = list.filter((j) => j.salary).length;
      const hasExperience = list.filter((j) => j.experienceLevel || j.experienceYears).length;
      const hasEducation = list.filter((j) => j.educationLevel).length;
      const hasSkills = list.filter((j) => j.skills.length > 0).length;
      const hasRawHtml = list.filter((j) => j.rawHtml && j.rawHtml.length > 100).length;
      const qualityScores = list.map((j) => j.qualityScore).filter((s): s is number => s !== null);
      const avgQuality = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : null;

      return {
        source,
        jobs: list.length,
        avgDescLen: Math.round(avgDescLen),
        avgTitleLen: Math.round(avgTitleLen),
        descEqualsTitle,
        descOver500,
        hasRequirements,
        hasContract,
        hasSalary,
        hasExperience,
        hasEducation,
        hasSkills,
        hasRawHtml,
        avgQuality,
      };
    })
    .sort((a, b) => b.jobs - a.jobs);

  const lines: string[] = [];
  const section = (title: string, body: string) => {
    lines.push(`\n## ${title}\n`);
    lines.push(body);
  };

  lines.push('# Letravail Employment Intelligence — Data Quality Audit');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`\nTotal jobs: **${total}**`);
  lines.push(`\nDescription completeness target: **>${DESC_TARGET} characters**`);

  // 1. Source Quality Audit
  const sourceTable = [
    '| Source | Jobs | Avg Desc Len | Desc=Title % | Completeness (>500) | Status |',
    '|--------|------|--------------|--------------|---------------------|--------|',
    ...sourceRows.map((r) => {
      const status = classifySource(r);
      return `| ${r.source} | ${r.jobs} | ${r.avgDescLen} | ${pct(r.descEqualsTitle, r.jobs)} | ${pct(r.descOver500, r.jobs)} | **${status}** |`;
    }),
  ].join('\n');
  section('1. Source Quality Audit', sourceTable);

  // 2. Description Quality Audit
  const allDescLens = jobs.map((j) => j.description.length);
  const avgAllDesc = Math.round(allDescLens.reduce((a, b) => a + b, 0) / total);
  const shortDesc = jobs.filter((j) => j.description.length < 100).length;
  const titleOnly = jobs.filter((j) => j.description.trim() === j.title.trim()).length;
  const goodDesc = jobs.filter((j) => j.description.length >= DESC_TARGET).length;
  section(
    '2. Description Quality Audit',
    [
      `- Average description length: **${avgAllDesc}** chars (target: >${DESC_TARGET})`,
      `- Jobs with description = title: **${titleOnly}** (${pct(titleOnly, total)})`,
      `- Jobs with description < 100 chars: **${shortDesc}** (${pct(shortDesc, total)})`,
      `- Jobs with description ≥ ${DESC_TARGET} chars: **${goodDesc}** (${pct(goodDesc, total)})`,
      '',
      '**Root causes identified:**',
      '- Listing-only scrapers set `description: title` (generic scrapers, CIH, LinkedIn without detail fetch)',
      '- Detail pages not visited for CIH, DXC, and most sources',
      '- Attijariwafa uses API list payload only; full HTML often truncated in list endpoint',
      '- LinkedIn detail fetch disabled by default (`LINKEDIN_DETAIL_FETCH_LIMIT=0`)',
    ].join('\n'),
  );

  // 3-8 Coverage reports
  const coverage = (label: string, count: number) =>
    `- ${label}: **${count}** / ${total} (${pct(count, total)})`;

  const skillJobs = jobs.filter((j) => j.skills.length > 0).length;
  const totalSkillLinks = jobs.reduce((a, j) => a + j.skills.length, 0);
  const skillCatalog = await db.skill.count();

  section(
    '3. Skill Extraction Coverage',
    [
      coverage('Jobs with ≥1 skill', skillJobs),
      `- Total job-skill links: **${totalSkillLinks}**`,
      `- Skills catalog size: **${skillCatalog}**`,
      '',
      '| Source | Jobs | With Skills | Coverage |',
      '|--------|------|-------------|----------|',
      ...sourceRows.map(
        (r) => {
          const list = bySource.get(r.source)!;
          const withSkills = list.filter((j) => j.skills.length > 0).length;
          return `| ${r.source} | ${r.jobs} | ${withSkills} | ${pct(withSkills, r.jobs)} |`;
        },
      ),
    ].join('\n'),
  );

  const expJobs = jobs.filter((j) => j.experienceLevel || j.experienceYears).length;
  section(
    '4. Experience Extraction Coverage',
    [
      coverage('Jobs with experience data', expJobs),
      '',
      '| Source | With Experience | Coverage |',
      '|--------|-----------------|----------|',
      ...sourceRows.map((r) => `| ${r.source} | ${r.hasExperience} | ${pct(r.hasExperience, r.jobs)} |`),
    ].join('\n'),
  );

  const contractJobs = jobs.filter((j) => j.contractType).length;
  section(
    '5. Contract Coverage',
    [
      coverage('Jobs with contract type', contractJobs),
      '',
      '| Source | With Contract | Coverage |',
      '|--------|---------------|----------|',
      ...sourceRows.map((r) => `| ${r.source} | ${r.hasContract} | ${pct(r.hasContract, r.jobs)} |`),
    ].join('\n'),
  );

  const eduJobs = jobs.filter((j) => j.educationLevel).length;
  section(
    '6. Education Coverage',
    [
      coverage('Jobs with education level', eduJobs),
      '',
      '| Source | With Education | Coverage |',
      '|--------|----------------|----------|',
      ...sourceRows.map((r) => `| ${r.source} | ${r.hasEducation} | ${pct(r.hasEducation, r.jobs)} |`),
    ].join('\n'),
  );

  const salaryJobs = jobs.filter((j) => j.salary).length;
  section(
    '7. Salary Coverage',
    [
      coverage('Jobs with explicit salary', salaryJobs),
      '- Note: NULL is correct when source does not publish salary. No synthetic values.',
      '',
      '| Source | With Salary | Coverage |',
      '|--------|-------------|----------|',
      ...sourceRows.map((r) => `| ${r.source} | ${r.hasSalary} | ${pct(r.hasSalary, r.jobs)} |`),
    ].join('\n'),
  );

  const companyEnriched = jobs.filter((j) => {
    const c = j.companyRef;
    if (!c) return false;
    return !!(c.websiteUrl || c.logoUrl || c.industry || c.size || c.careerPageUrl || c.linkedinUrl);
  }).length;
  const locationEnriched = jobs.filter((j) => j.location?.region || j.location?.canonicalCity).length;

  section(
    '8. Company & Location Coverage',
    [
      coverage('Jobs linked to enriched company profile', companyEnriched),
      coverage('Jobs with normalized location (region/canonical city)', locationEnriched),
      '',
      '| Source | Company Enriched | Location Normalized |',
      '|--------|------------------|---------------------|',
      ...sourceRows.map((r) => {
        const list = bySource.get(r.source)!;
        const co = list.filter((j) => {
          const c = j.companyRef;
          return c && (c.websiteUrl || c.logoUrl || c.industry || c.size || c.careerPageUrl || c.linkedinUrl);
        }).length;
        const loc = list.filter((j) => j.location?.region || j.location?.canonicalCity).length;
        return `| ${r.source} | ${pct(co, r.jobs)} | ${pct(loc, r.jobs)} |`;
      }),
    ].join('\n'),
  );

  // 9. Database Enrichment Impact Report
  const avgQuality = jobs
    .map((j) => j.qualityScore)
    .filter((s): s is number => s !== null);
  const overallQuality = avgQuality.length > 0
    ? (avgQuality.reduce((a, b) => a + b, 0) / avgQuality.length).toFixed(1)
    : 'N/A';

  section(
    '9. Database Enrichment Impact Report',
    [
      '**Current intelligence density (pre/post enrichment pipeline):**',
      '',
      '| Dimension | Coverage | Platform Impact |',
      '|-----------|----------|-----------------|',
      `| Rich descriptions | ${pct(goodDesc, total)} | Profession pages, SEO, knowledge graph |`,
      `| Skills | ${pct(skillJobs, total)} | Skill demand, salary-by-skill, trends |`,
      `| Experience | ${pct(expJobs, total)} | Seniority filters, salary intelligence |`,
      `| Contract type | ${pct(contractJobs, total)} | Contract SEO pages, market segmentation |`,
      `| Education | ${pct(eduJobs, total)} | Education requirement pages |`,
      `| Salary (explicit only) | ${pct(salaryJobs, total)} | Salary pages (no synthetic data) |`,
      `| Company enrichment | ${pct(companyEnriched, total)} | Company intelligence pages |`,
      `| Location normalization | ${pct(locationEnriched, total)} | City SEO, salary-by-city |`,
      '',
      `**Overall quality score (avg):** ${overallQuality}/100`,
      '',
      '**Per-source quality scores:**',
      '',
      '| Source | Avg Quality | Description | Skills | Experience | Contract | Salary | Company |',
      '|--------|-------------|-------------|--------|------------|----------|--------|---------|',
      ...sourceRows.map((r) => {
        const list = bySource.get(r.source)!;
        const descScore = list.filter((j) => j.description.length >= DESC_TARGET).length;
        return `| ${r.source} | ${r.avgQuality?.toFixed(0) ?? '—'} | ${pct(descScore, r.jobs)} | ${pct(r.hasSkills, r.jobs)} | ${pct(r.hasExperience, r.jobs)} | ${pct(r.hasContract, r.jobs)} | ${pct(r.hasSalary, r.jobs)} | — |`;
      }),
      '',
      '**Recommendation:** Run enrichment pipeline + detail-page fetchers, then re-scrape priority sources (CIH, Attijariwafa, LinkedIn, DXC).',
    ].join('\n'),
  );

  const reportPath = join(REPORT_DIR, 'data-quality-audit.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`\nAudit report written to: ${reportPath}\n`);
  console.log(lines.join('\n'));

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
