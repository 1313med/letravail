/**
 * Re-fetch LinkedIn job details for legacy title-only records via guest API.
 */
import { getPrisma } from '../src/lib/prisma.js';
import { fetchViaGuestApiDirect } from '../src/scrapers/linkedin/detail-fetcher.js';
import { enrichAndPrepare } from '../src/services/enrichment.service.js';
import { mergeDetailContent } from '../src/enrichment/job-enrichment.service.js';
import { CompanyRepository } from '../src/repositories/company.repository.js';
import { JobRepository } from '../src/repositories/job.repository.js';
import { LocationRepository } from '../src/repositories/location.repository.js';
import { SkillRepository } from '../src/repositories/skill.repository.js';
import { TagRepository } from '../src/repositories/tag.repository.js';
import type { Job } from '../src/types/job.js';

const MIN_RICH = 500;
const CONCURRENCY = 8;
const DELAY_MS = 200;

const db = getPrisma();
const jobRepo = new JobRepository(
  db,
  new CompanyRepository(db),
  new LocationRepository(db),
  new TagRepository(db),
  new SkillRepository(db),
);

const legacy = await db.job.findMany({
  where: { source: 'linkedin', isActive: true },
  select: {
    id: true,
    sourceJobId: true,
    title: true,
    company: true,
    city: true,
    country: true,
    description: true,
    applicationUrl: true,
  },
});

const needsRecrawl = legacy.filter(
  (j) => j.description.length < MIN_RICH || j.description.trim() === j.title.trim(),
);

console.log(`LinkedIn legacy backfill: ${needsRecrawl.length} / ${legacy.length} jobs need re-fetch`);

let success = 0;
let failed = 0;
let updated = 0;

for (let i = 0; i < needsRecrawl.length; i += CONCURRENCY) {
  const batch = needsRecrawl.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (row) => {
      const detail = await fetchViaGuestApiDirect(row.sourceJobId);
      return { row, detail };
    }),
  );

  const toPersist: ReturnType<typeof enrichAndPrepare> = [];

  for (const { row, detail } of results) {
    if (detail.description.length < 200) {
      failed++;
      continue;
    }
    success++;

    const base: Job = {
      source: 'linkedin',
      sourceJobId: row.sourceJobId,
      title: detail.title || row.title,
      company: detail.company || row.company,
      city: detail.city || row.city,
      country: row.country,
      description: detail.description,
      requirements: detail.requirements,
      applicationUrl: row.applicationUrl,
      rawHtml: detail.rawHtml,
      tags: ['linkedin', 'morocco'],
    };

    toPersist.push(...enrichAndPrepare([mergeDetailContent(base, detail)]));
  }

  if (toPersist.length > 0) {
    const result = await jobRepo.upsertEnrichedMany(
      toPersist.map((e) => ({ job: e.job, skills: e.skills, companyEnrichment: e.companyEnrichment })),
    );
    updated += result.updated + result.inserted;
  }

  console.log(`Progress: ${Math.min(i + CONCURRENCY, needsRecrawl.length)}/${needsRecrawl.length} | success=${success} failed=${failed}`);
  await sleep(DELAY_MS);
}

const after = await db.job.aggregate({
  where: { source: 'linkedin', isActive: true },
  _count: { id: true },
});

const rich = await db.job.count({
  where: { source: 'linkedin', isActive: true, description: { not: '' } },
});

const richLong = await db.$queryRaw<[{ count: bigint }]>`
  SELECT COUNT(*)::bigint as count FROM jobs
  WHERE source = 'linkedin' AND "isActive" = true AND LENGTH(description) >= ${MIN_RICH}
`;
const withSkills = await db.job.count({
  where: { source: 'linkedin', isActive: true, skills: { some: {} } },
});

const total = Number(after._count.id);
const richCount = Number(richLong[0]?.count ?? 0);
const skillCount = withSkills;

console.log('\n## LinkedIn Backfill Complete');
console.log(`Re-fetched: ${success} | Failed: ${failed} | DB updated: ${updated}`);
console.log(`Rich descriptions (≥${MIN_RICH} chars): ${richCount}/${total} (${total > 0 ? ((richCount / total) * 100).toFixed(1) : 0}%)`);
console.log(`Skill coverage: ${skillCount}/${total} (${total > 0 ? ((skillCount / total) * 100).toFixed(1) : 0}%)`);

await db.$disconnect();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
