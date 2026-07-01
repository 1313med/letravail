import type { Prisma, PrismaClient } from '@prisma/client';
import type { LinkedInEmployerHint } from '../scrapers/linkedin/employer-hint.js';
import {
  normalizeEmployerName,
  recommendSourceName,
  parseLinkedInCompanyUrl,
} from '../scrapers/linkedin/employer-hint.js';

export interface UpsertDiscoveryResult {
  id: string;
  isNew: boolean;
  companyName: string;
  normalizedName: string;
  onboardingStatus: string;
}

export class EmployerDiscoveryRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertFromHint(hint: LinkedInEmployerHint): Promise<UpsertDiscoveryResult> {
    const normalizedName = normalizeEmployerName(hint.companyName);
    const linkedinSlug =
      hint.linkedinSlug ??
      (hint.linkedinUrl ? parseLinkedInCompanyUrl(hint.linkedinUrl)?.slug : undefined);
    const linkedinUrl =
      hint.linkedinUrl ??
      (linkedinSlug ? `https://www.linkedin.com/company/${linkedinSlug}/` : undefined);
    const recommendedSourceName = recommendSourceName(hint.companyName);
    const jobIncrement = hint.jobIds?.length ?? 1;

    const existing = await this.findExisting(normalizedName, linkedinSlug);

    if (existing) {
      const updated = await this.db.employerDiscovery.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          jobCountSeen: { increment: jobIncrement },
          hiringStatus:
            hint.hiringStatus === 'actively_hiring' || existing.hiringStatus === 'actively_hiring'
              ? 'actively_hiring'
              : existing.hiringStatus,
          ...pickDefined({
            companyName: hint.companyName.length > existing.companyName.length
              ? hint.companyName
              : undefined,
            linkedinUrl: existing.linkedinUrl ? undefined : linkedinUrl,
            linkedinSlug: existing.linkedinSlug ? undefined : linkedinSlug,
            industry: hint.industry,
            headquarters: hint.headquarters,
            location: hint.location,
            companySize: hint.companySize,
            logoUrl: hint.logoUrl,
            description: hint.description,
            websiteUrl: hint.websiteUrl,
            careersUrl: hint.careersUrl,
            discoverySource: hint.discoverySource,
            recommendedSourceName,
          }),
        },
      });
      return {
        id: updated.id,
        isNew: false,
        companyName: updated.companyName,
        normalizedName: updated.normalizedName,
        onboardingStatus: updated.onboardingStatus,
      };
    }

    const created = await this.db.employerDiscovery.create({
      data: {
        companyName: hint.companyName,
        normalizedName,
        linkedinUrl,
        linkedinSlug: linkedinSlug ?? null,
        industry: hint.industry,
        headquarters: hint.headquarters,
        location: hint.location,
        companySize: hint.companySize,
        logoUrl: hint.logoUrl,
        description: hint.description,
        websiteUrl: hint.websiteUrl,
        careersUrl: hint.careersUrl,
        hiringStatus: hint.hiringStatus ?? 'unknown',
        discoverySource: hint.discoverySource,
        jobCountSeen: jobIncrement,
        recommendedSourceName,
        metadata: hint.jobIds ? ({ jobIds: hint.jobIds } as Prisma.InputJsonValue) : undefined,
      },
    });

    return {
      id: created.id,
      isNew: true,
      companyName: created.companyName,
      normalizedName: created.normalizedName,
      onboardingStatus: created.onboardingStatus,
    };
  }

  async findExisting(normalizedName: string, linkedinSlug?: string) {
    if (linkedinSlug) {
      const bySlug = await this.db.employerDiscovery.findUnique({
        where: { linkedinSlug },
      });
      if (bySlug) return bySlug;
    }
    return this.db.employerDiscovery.findUnique({ where: { normalizedName } });
  }

  async linkCompany(discoveryId: string, companyId: string): Promise<void> {
    await this.db.employerDiscovery.update({
      where: { id: discoveryId },
      data: { companyId, onboardingStatus: 'enriched' },
    });
  }

  async markProbed(
    discoveryId: string,
    data: {
      websiteUrl?: string;
      careersUrl?: string;
      atsPlatform?: string;
      probeConfidence?: number;
      sourceName?: string;
      registered: boolean;
    },
  ): Promise<void> {
    await this.db.employerDiscovery.update({
      where: { id: discoveryId },
      data: {
        onboardingStatus: data.registered ? 'registered' : 'probed',
        websiteUrl: data.websiteUrl,
        careersUrl: data.careersUrl,
        atsPlatform: data.atsPlatform,
        probeConfidence: data.probeConfidence,
        sourceName: data.sourceName,
      },
    });
  }

  async getPendingOnboarding(limit = 10) {
    return this.db.employerDiscovery.findMany({
      where: {
        onboardingStatus: { in: ['discovered', 'enriched'] },
        OR: [{ websiteUrl: { not: null } }, { linkedinSlug: { not: null } }],
      },
      orderBy: [{ hiringStatus: 'desc' }, { jobCountSeen: 'desc' }, { lastSeenAt: 'desc' }],
      take: limit,
    });
  }

  async getStats() {
    const [total, newToday, activelyHiring, probed, registered] = await Promise.all([
      this.db.employerDiscovery.count(),
      this.db.employerDiscovery.count({
        where: { discoveredAt: { gte: startOfToday() } },
      }),
      this.db.employerDiscovery.count({ where: { hiringStatus: 'actively_hiring' } }),
      this.db.employerDiscovery.count({ where: { onboardingStatus: 'probed' } }),
      this.db.employerDiscovery.count({ where: { onboardingStatus: 'registered' } }),
    ]);
    return { total, newToday, activelyHiring, probed, registered };
  }

  async getRecent(limit = 50) {
    return this.db.employerDiscovery.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
    });
  }

  async isKnownEmployer(normalizedName: string, linkedinSlug?: string): Promise<boolean> {
    const discovery = await this.findExisting(normalizedName, linkedinSlug);
    if (discovery) return true;

    const company = await this.db.company.findFirst({
      where: {
        OR: [
          { name: { equals: normalizedName, mode: 'insensitive' } },
          linkedinSlug
            ? { linkedinUrl: { contains: linkedinSlug, mode: 'insensitive' } }
            : undefined,
        ].filter(Boolean) as Prisma.CompanyWhereInput[],
      },
    });
    return !!company;
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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
