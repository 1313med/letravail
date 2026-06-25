import type { PrismaClient } from '@prisma/client';
import type { CompanyEnrichmentInput } from '../types/job.js';
import { slugifyEntity } from '../utils/slug.js';

export class CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(name: string, enrichment?: CompanyEnrichmentInput): Promise<string> {
    const slug = slugifyEntity(name);
    const company = await this.db.company.upsert({
      where: { name },
      create: {
        name,
        slug,
        websiteUrl: enrichment?.websiteUrl,
        logoUrl: enrichment?.logoUrl,
        industry: enrichment?.industry,
        size: enrichment?.size,
        careerPageUrl: enrichment?.careerPageUrl,
        linkedinUrl: enrichment?.linkedinUrl,
      },
      update: {
        slug,
        ...(enrichment?.websiteUrl && { websiteUrl: enrichment.websiteUrl }),
        ...(enrichment?.logoUrl && { logoUrl: enrichment.logoUrl }),
        ...(enrichment?.industry && { industry: enrichment.industry }),
        ...(enrichment?.size && { size: enrichment.size }),
        ...(enrichment?.careerPageUrl && { careerPageUrl: enrichment.careerPageUrl }),
        ...(enrichment?.linkedinUrl && { linkedinUrl: enrichment.linkedinUrl }),
      },
    });
    return company.id;
  }
}
