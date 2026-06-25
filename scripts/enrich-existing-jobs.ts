/**
 * Re-enrich all existing jobs in PostgreSQL with the employment intelligence pipeline.
 */
import { getPrisma } from '../src/lib/prisma.js';
import { enrichJob } from '../src/enrichment/job-enrichment.service.js';
import { CompanyRepository } from '../src/repositories/company.repository.js';
import { JobRepository } from '../src/repositories/job.repository.js';
import { LocationRepository } from '../src/repositories/location.repository.js';
import { SkillRepository } from '../src/repositories/skill.repository.js';
import { TagRepository } from '../src/repositories/tag.repository.js';
import type { Job } from '../src/types/job.js';

const db = getPrisma();

async function main(): Promise<void> {
  const existing = await db.job.findMany({
    include: { tags: { include: { tag: true } } },
  });

  console.log(`Re-enriching ${existing.length} jobs...`);

  const repo = new JobRepository(
    db,
    new CompanyRepository(db),
    new LocationRepository(db),
    new TagRepository(db),
    new SkillRepository(db),
  );

  const inputs = existing.map((row) => {
    const job: Job = {
      source: row.source,
      sourceJobId: row.sourceJobId,
      title: row.title,
      company: row.company,
      city: row.city,
      country: row.country,
      description: row.description,
      requirements: row.requirements ?? undefined,
      salary: row.salary ?? undefined,
      contractType: row.contractType ?? undefined,
      remote: row.remote,
      applicationUrl: row.applicationUrl,
      publishedAt: row.publishedAt ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      tags: row.tags.map((t) => t.tag.name),
      rawHtml: row.rawHtml ?? undefined,
    };

    const enriched = enrichJob(job);
    return {
      job: enriched.job,
      skills: enriched.skills,
      companyEnrichment: enriched.companyEnrichment,
    };
  });

  const batchSize = 50;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await repo.upsertEnrichedMany(batch);
    console.log(
      `  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(inputs.length / batchSize)}: updated=${res.updated}, inserted=${res.inserted}`,
    );
  }

  console.log('\nRe-enrichment complete.');
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
