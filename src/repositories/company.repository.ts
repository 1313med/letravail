import type { PrismaClient } from '@prisma/client';
import type { CompanyEnrichmentInput } from '../types/job.js';
import { resolveCompany } from '../platform/company-resolver.js';
import { enrichCompany } from '../enrichment/company-enrichment.js';
import { slugifyEntity } from '../utils/slug.js';

export class CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsert(rawName: string, enrichment?: CompanyEnrichmentInput): Promise<string> {
    const resolution = resolveCompany(rawName);
    const name = resolution.canonicalName;
    const known = enrichCompany(name);
    const merged: CompanyEnrichmentInput = {
      ...known,
      ...enrichment,
    };

    const baseSlug = slugifyEntity(name);
    const data = {
      name,
      canonicalName: name,
      resolutionConfidence: resolution.confidence,
      websiteUrl: merged.websiteUrl,
      logoUrl: merged.logoUrl,
      industry: merged.industry,
      sector: merged.sector,
      size: merged.size,
      careerPageUrl: merged.careerPageUrl,
      linkedinUrl: merged.linkedinUrl,
      headquartersCity: merged.headquartersCity,
      description: merged.description,
    };

    const existingByName = await this.db.company.findUnique({ where: { name } });
    if (existingByName) {
      await this.db.company.update({
        where: { id: existingByName.id },
        data: {
          ...pickDefined({
            canonicalName: name,
            resolutionConfidence: resolution.confidence,
            websiteUrl: merged.websiteUrl,
            logoUrl: merged.logoUrl,
            industry: merged.industry,
            sector: merged.sector,
            size: merged.size,
            careerPageUrl: merged.careerPageUrl,
            linkedinUrl: merged.linkedinUrl,
            headquartersCity: merged.headquartersCity,
            description: merged.description,
          }),
        },
      });
      await this.recordAlias(resolution, existingByName.id);
      return existingByName.id;
    }

    let slug = baseSlug;
    const slugTaken = await this.db.company.findUnique({ where: { slug } });
    if (slugTaken && slugTaken.name !== name) {
      slug = `${baseSlug}-${slugifyEntity(name).slice(0, 8)}`;
      if (slug.length < 3) slug = `${baseSlug}-${Date.now().toString(36).slice(-6)}`;
    }

    try {
      const company = await this.db.company.create({
        data: { ...data, slug },
      });
      await this.recordAlias(resolution, company.id);
      return company.id;
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        const bySlug = await this.db.company.findUnique({ where: { slug: baseSlug } });
        if (bySlug) {
          await this.recordAlias(resolution, bySlug.id);
          return bySlug.id;
        }
        const fallback = await this.db.company.findFirst({
          where: { name: { contains: name.slice(0, 20), mode: 'insensitive' } },
        });
        if (fallback) {
          await this.recordAlias(resolution, fallback.id);
          return fallback.id;
        }
      }
      throw err;
    }
  }

  private async recordAlias(
    resolution: ReturnType<typeof resolveCompany>,
    companyId: string,
  ): Promise<void> {
    if (resolution.matchedVia !== 'exact' && resolution.aliasUsed) {
      const aliasKey = resolution.aliasUsed.toLowerCase().trim();
      await this.db.companyAlias
        .upsert({
          where: { alias: aliasKey },
          create: {
            alias: aliasKey,
            companyId,
            confidence: resolution.confidence,
            isManual: false,
          },
          update: { companyId, confidence: resolution.confidence },
        })
        .catch(() => undefined);
    }
  }
}

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}
