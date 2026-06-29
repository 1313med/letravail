import type { Prisma, PrismaClient } from '@prisma/client';
import { initialActivationState } from '../platform/activation-states.js';
import type { EmployerOnboardingReport } from '../platform/employer-onboarding.js';

export interface PersistProbeOptions {
  sourceName?: string;
  companyName: string;
  inputUrl: string;
}

export class AtsIntelligenceRepository {
  constructor(private readonly db: PrismaClient) {}

  async saveProbe(report: EmployerOnboardingReport, opts: PersistProbeOptions) {
    const platformConfig: Record<string, unknown> = {};
    if (report.greenhouseToken) platformConfig.greenhouseBoard = report.greenhouseToken;
    if (report.leverSlug) platformConfig.leverSlug = report.leverSlug;
    if (report.workdayConfig) platformConfig.workday = report.workdayConfig;
    if (report.atsDetected === 'successfactors' && report.apiEndpoints.length > 0) {
      platformConfig.successFactorsApi = report.apiEndpoints.find((e) => /\/api\/offers/i.test(e));
    }
    if (report.atsDetected === 'custom' && report.apiEndpoints.some((e) => /intelcia\.com\/api/i.test(e))) {
      platformConfig.intelciaApi = report.apiEndpoints.find((e) => /intelcia\.com\/api/i.test(e));
    }
    if (report.careersPageUrl?.includes('talent-soft.com')) {
      platformConfig.talentSoftListingUrl = report.careersPageUrl;
    }

    const jsRenderingRequired =
      report.crawlStrategy === 'dom' ||
      report.crawlStrategy === 'hybrid' ||
      report.atsDetected === 'taleo' ||
      report.atsDetected === 'icims';

    const record = await this.db.employerAtsIntelligence.create({
      data: {
        sourceName: opts.sourceName,
        companyName: opts.companyName,
        inputUrl: opts.inputUrl,
        careersPageUrl: report.careersPageUrl,
        finalUrl: report.careersPageUrl ?? opts.inputUrl,
        atsPlatform: report.atsDetected,
        confidence: report.confidenceScore,
        crawlStrategy: report.crawlStrategy,
        recommendedAdapter: report.recommendedAdapter,
        apiEndpoints: report.apiEndpoints,
        platformConfig: Object.keys(platformConfig).length > 0
          ? (platformConfig as Prisma.InputJsonValue)
          : undefined,
        robotsAllowed: report.robotsAllowed,
        sitemapUrls: report.sitemapUrls,
        jsRenderingRequired,
        paginationType: inferPagination(report),
        detailEndpoint: report.apiEndpoints.find((e) => /detail|posting|offer/i.test(e)),
        estimatedJobVolume: report.estimatedJobVolume,
        technicalComplexity: report.technicalComplexity,
        maintenanceEffort: report.maintenanceEffort,
        graphqlDetected: report.graphqlDetected,
        structuredData: report.structuredData,
        issues: report.issues,
        investigationReasons: report.investigationReasons,
        activationState: initialActivationState(report.confidenceScore),
        onboardingStatus: report.confidenceScore >= 70 ? 'ready' : 'probed',
        rawProbe: report as unknown as Prisma.InputJsonValue,
      },
    });

    if (opts.sourceName) {
      await this.syncToSourceProfile(opts.sourceName, record);
    }

    return record;
  }

  async getLatestForSource(sourceName: string) {
    return this.db.employerAtsIntelligence.findFirst({
      where: { sourceName },
      orderBy: { probedAt: 'desc' },
    });
  }

  async getLatestForCompany(companyName: string) {
    return this.db.employerAtsIntelligence.findFirst({
      where: { companyName: { equals: companyName, mode: 'insensitive' } },
      orderBy: { probedAt: 'desc' },
    });
  }

  async getReadyEmployers(limit = 50) {
    return this.db.employerAtsIntelligence.findMany({
      where: { onboardingStatus: { in: ['ready', 'active'] }, confidence: { gte: 60 } },
      orderBy: { confidence: 'desc' },
      take: limit,
    });
  }

  async getUnprobedCatalogSources(
    catalogSources: Array<{ sourceName: string; careerPageUrl?: string; companyName: string }>,
    maxAgeDays = 14,
  ) {
    const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000);
    const recent = await this.db.employerAtsIntelligence.findMany({
      where: { probedAt: { gte: cutoff } },
      select: { sourceName: true, companyName: true },
    });
    const probed = new Set(recent.flatMap((r) => [r.sourceName, r.companyName].filter(Boolean)));

    return catalogSources.filter(
      (c) => !probed.has(c.sourceName) && !probed.has(c.companyName),
    );
  }

  async listByAtsPlatform(atsPlatform: string) {
    return this.db.employerAtsIntelligence.findMany({
      where: { atsPlatform },
      orderBy: { confidence: 'desc' },
    });
  }

  private async syncToSourceProfile(
    sourceName: string,
    probe: { atsPlatform: string; confidence: number; crawlStrategy: string; careersPageUrl: string | null; jsRenderingRequired: boolean },
  ) {
    const existing = await this.db.sourceProfile.findUnique({ where: { sourceName } });
    if (!existing) return;

    await this.db.sourceProfile.update({
      where: { sourceName },
      data: {
        atsPlatform: probe.confidence >= (existing.probeConfidence ?? 0) ? probe.atsPlatform : existing.atsPlatform,
        careerPageUrl: probe.careersPageUrl ?? existing.careerPageUrl,
        probeConfidence: Math.max(probe.confidence, existing.probeConfidence ?? 0),
        crawlStrategy: probe.crawlStrategy,
        lastProbedAt: new Date(),
        jsRenderingRequired: probe.jsRenderingRequired,
      },
    });
  }
}

function inferPagination(report: EmployerOnboardingReport): string {
  if (report.atsDetected === 'workday' || report.atsDetected === 'greenhouse') return 'offset';
  if (report.atsDetected === 'lever') return 'cursor';
  if (report.apiEndpoints.some((e) => /page|offset|limit/i.test(e))) return 'offset';
  return 'unknown';
}
