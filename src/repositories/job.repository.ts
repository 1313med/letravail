import type { Prisma, PrismaClient } from '@prisma/client';
import type { EnrichedJob, Job, JobSkillInput, CompanyEnrichmentInput } from '../types/job.js';
import { generateJobHash } from '../utils/hash.js';
import { generateJobSlug, slugifyEntity } from '../utils/slug.js';
import type { CompanyRepository } from './company.repository.js';
import type { LocationRepository } from './location.repository.js';
import type { SkillRepository } from './skill.repository.js';
import type { TagRepository } from './tag.repository.js';
import type { PersistResult } from '../types/job.js';

export interface EnrichedPersistInput {
  job: EnrichedJob;
  skills: JobSkillInput[];
  companyEnrichment?: CompanyEnrichmentInput;
}

export class JobRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly companyRepo: CompanyRepository,
    private readonly locationRepo: LocationRepository,
    private readonly tagRepo: TagRepository,
    private readonly skillRepo: SkillRepository,
  ) {}

  async upsertMany(jobs: Job[]): Promise<PersistResult> {
    return this.upsertEnrichedMany(
      jobs.map((job) => ({ job: job as EnrichedJob, skills: [] })),
    );
  }

  async upsertEnrichedMany(inputs: EnrichedPersistInput[]): Promise<PersistResult> {
    let inserted = 0;
    let updated = 0;
    let duplicates = 0;

    for (const { job, skills, companyEnrichment } of inputs) {
      const hash = generateJobHash(job);
      let slug = generateJobSlug(job);

      const existing =
        (job.sourceJobId
          ? await this.db.job.findUnique({
              where: {
                source_sourceJobId: { source: job.source, sourceJobId: job.sourceJobId },
              },
            })
          : null) ?? (await this.db.job.findUnique({ where: { hash } }));

      const slugConflict = await this.db.job.findUnique({ where: { slug } });
      if (slugConflict && slugConflict.id !== existing?.id) {
        slug = `${slug}-${hash.slice(0, 8)}`;
      }

      const hashConflict = await this.db.job.findUnique({ where: { hash } });
      const safeHash =
        hashConflict && hashConflict.id !== existing?.id
          ? `${hash.slice(0, 56)}${job.sourceJobId.slice(0, 8)}`
          : hash;

      const companyId = await this.companyRepo.upsert(job.company, companyEnrichment);
      const locationId = await this.locationRepo.upsert(job.city, job.country, {
        region: job.region,
        canonicalCity: job.canonicalCity,
      });
      const tagMap = await this.tagRepo.upsertMany(job.tags);

      const allSkills = [...skills];
      const skillIdMap = await this.skillRepo.upsertMany(allSkills);
      const data = this.buildJobFields(job, safeHash, slug, companyId, locationId);

      let jobId: string;

      if (existing) {
        duplicates++;
        await this.db.job.update({ where: { id: existing.id }, data });
        jobId = existing.id;
        updated++;

        await this.db.jobTag.deleteMany({ where: { jobId } });
        await this.db.jobTag.createMany({
          data: [...tagMap.values()].map((tagId) => ({ jobId, tagId })),
        });
      } else {
        try {
          const created = await this.db.job.create({
            data: {
              ...data,
              tags: {
                create: [...tagMap.values()].map((tagId) => ({ tagId })),
              },
            },
          });
          jobId = created.id;
          inserted++;
        } catch (error) {
          if (!isUniqueConstraint(error) || !job.sourceJobId) throw error;

          const bySource = await this.db.job.findUnique({
            where: {
              source_sourceJobId: { source: job.source, sourceJobId: job.sourceJobId },
            },
          });
          if (!bySource) throw error;

          duplicates++;
          await this.db.job.update({ where: { id: bySource.id }, data });
          jobId = bySource.id;
          updated++;

          await this.db.jobTag.deleteMany({ where: { jobId } });
          await this.db.jobTag.createMany({
            data: [...tagMap.values()].map((tagId) => ({ jobId, tagId })),
          });
        }
      }

      await this.skillRepo.linkToJob(jobId, allSkills, skillIdMap);

      if (job.salaryMin || job.salaryMax) {
        await this.upsertSalaryObservation(jobId, job);
      }

      if (allSkills.length > 0) {
        const profession = job.title.split(/\s+/).slice(0, 3).join(' ');
        await this.skillRepo.updateProfessionSkills(
          profession,
          allSkills.map((s) => s.slug),
        );
      }
    }

    return { inserted, updated, duplicates };
  }

  private buildJobFields(
    job: EnrichedJob,
    hash: string,
    slug: string,
    companyId: string,
    locationId: string,
  ) {
    return {
      source: job.source,
      sourceJobId: job.sourceJobId,
      hash,
      slug,
      title: job.title,
      company: job.company,
      city: job.city,
      country: job.country,
      description: job.description,
      requirements: job.requirements,
      salary: job.salary,
      contractType: job.contractType,
      remote: job.remote ?? false,
      applicationUrl: job.applicationUrl,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      rawHtml: job.rawHtml,
      extractionMetadata: job.extractionMetadata as Prisma.InputJsonValue | undefined,
      experienceLevel: job.experienceLevel,
      experienceYears: job.experienceYears,
      educationLevel: job.educationLevel,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      salaryNet: job.salaryNet,
      qualityScore: job.qualityScore,
      descriptionScore: job.descriptionScore,
      companyId,
      locationId,
    };
  }

  private async upsertSalaryObservation(jobId: string, job: EnrichedJob): Promise<void> {
    const existing = await this.db.salaryObservation.findFirst({ where: { jobId } });
    const data = {
      titleNorm: job.title,
      citySlug: slugifyEntity(job.city),
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.salaryCurrency ?? 'MAD',
      contractType: job.contractType,
      source: job.source,
    };

    if (existing) {
      await this.db.salaryObservation.update({ where: { id: existing.id }, data });
      return;
    }

    await this.db.salaryObservation.create({
      data: {
        id: `sal-${jobId}`,
        jobId,
        ...data,
      },
    });
  }
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}
