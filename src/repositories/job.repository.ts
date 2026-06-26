import type { Prisma, PrismaClient } from '@prisma/client';
import type { EnrichedJob, Job, JobSkillInput, CompanyEnrichmentInput } from '../types/job.js';
import { generateJobHash } from '../utils/hash.js';
import { generateContentHash } from '../utils/content-hash.js';
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
      const contentHash = generateContentHash(job.title, job.description, job.requirements);
      const dataWithHash = { ...data, contentHash };

      let jobId: string;

      if (existing) {
        duplicates++;
        const now = new Date();
        const contentChanged = existing.contentHash !== contentHash;

        if (contentChanged && existing.contentHash) {
          await this.db.jobVersion.create({
            data: {
              jobId: existing.id,
              contentHash: existing.contentHash,
              title: existing.title,
              description: existing.description,
              requirements: existing.requirements,
              rawHtml: existing.rawHtml,
            },
          });
        }

        await this.db.job.update({
          where: { id: existing.id },
          data: {
            ...dataWithHash,
            lastSeenAt: now,
            lastVerifiedAt: now,
            ...(contentChanged ? { lastModifiedAt: now } : {}),
            sourcePublishedAt: job.sourcePublishedAt ?? job.publishedAt,
            crawlCount: { increment: 1 },
            isActive: true,
            archivedAt: null,
            validationStatus: job.validationStatus,
            validationFlags: job.validationFlags ?? [],
          },
        });
        jobId = existing.id;
        updated++;

        await this.db.jobTag.deleteMany({ where: { jobId } });
        await this.db.jobTag.createMany({
          data: [...tagMap.values()].map((tagId) => ({ jobId, tagId })),
        });
      } else {
        try {
          const now = new Date();
          const created = await this.db.job.create({
            data: {
              ...dataWithHash,
              firstSeenAt: now,
              lastSeenAt: now,
              lastVerifiedAt: now,
              lastModifiedAt: now,
              sourcePublishedAt: job.sourcePublishedAt ?? job.publishedAt,
              crawlCount: 1,
              isActive: true,
              validationStatus: job.validationStatus ?? 'valid',
              validationFlags: job.validationFlags ?? [],
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
          const now = new Date();
          await this.db.job.update({
            where: { id: bySource.id },
            data: {
              ...dataWithHash,
              lastSeenAt: now,
              lastVerifiedAt: now,
              lastModifiedAt: bySource.contentHash !== contentHash ? now : bySource.lastModifiedAt,
              crawlCount: { increment: 1 },
              isActive: true,
              archivedAt: null,
              validationStatus: job.validationStatus,
              validationFlags: job.validationFlags ?? [],
            },
          });
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
      contentHash: job.contentHash,
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

  /** Mark jobs from a source not seen in the latest scrape as inactive */
  async markStaleInactive(source: string, seenSourceJobIds: string[]): Promise<number> {
    const result = await this.db.job.updateMany({
      where: {
        source,
        sourceJobId: { notIn: seenSourceJobIds },
        isActive: true,
      },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });
    return result.count;
  }

  /** Deactivate jobs past their expiration date */
  async deactivateExpired(): Promise<number> {
    const result = await this.db.job.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false, archivedAt: new Date() },
    });
    return result.count;
  }

  /** Archive jobs not verified within threshold days */
  async archiveUnverified(source: string, daysSinceVerified = 21): Promise<number> {
    const cutoff = new Date(Date.now() - daysSinceVerified * 86_400_000);
    const result = await this.db.job.updateMany({
      where: {
        source,
        isActive: true,
        lastVerifiedAt: { lt: cutoff },
      },
      data: { isActive: false, archivedAt: new Date() },
    });
    return result.count;
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
