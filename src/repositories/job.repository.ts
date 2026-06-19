import type { PrismaClient } from '@prisma/client';
import type { Job } from '../types/job.js';
import { generateJobHash } from '../utils/hash.js';
import { generateJobSlug } from '../utils/slug.js';
import type { CompanyRepository } from './company.repository.js';
import type { LocationRepository } from './location.repository.js';
import type { TagRepository } from './tag.repository.js';
import type { PersistResult } from '../types/job.js';

export class JobRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly companyRepo: CompanyRepository,
    private readonly locationRepo: LocationRepository,
    private readonly tagRepo: TagRepository,
  ) {}

  async upsertMany(jobs: Job[]): Promise<PersistResult> {
    let inserted = 0;
    let updated = 0;
    let duplicates = 0;

    for (const job of jobs) {
      const hash = generateJobHash(job);
      let slug = generateJobSlug(job);
      const existing = await this.db.job.findUnique({ where: { hash } });

      const slugConflict = await this.db.job.findUnique({ where: { slug } });
      if (slugConflict && slugConflict.hash !== hash) {
        slug = `${slug}-${hash.slice(0, 8)}`;
      }

      const companyId = await this.companyRepo.upsert(job.company);
      const locationId = await this.locationRepo.upsert(job.city, job.country);
      const tagMap = await this.tagRepo.upsertMany(job.tags);

      if (existing) {
        duplicates++;
        await this.db.job.update({
          where: { hash },
          data: {
            source: job.source,
            sourceJobId: job.sourceJobId,
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
            companyId,
            locationId,
          },
        });
        updated++;

        await this.db.jobTag.deleteMany({ where: { jobId: existing.id } });
        await this.db.jobTag.createMany({
          data: [...tagMap.values()].map((tagId) => ({ jobId: existing.id, tagId })),
        });
        continue;
      }

      const created = await this.db.job.create({
        data: {
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
          companyId,
          locationId,
          tags: {
            create: [...tagMap.values()].map((tagId) => ({ tagId })),
          },
        },
      });
      inserted++;
      void created;
    }

    return { inserted, updated, duplicates };
  }
}
