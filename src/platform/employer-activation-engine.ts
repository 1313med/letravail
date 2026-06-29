/**
 * Autonomous employer activation engine — Sprint 7.
 * Evaluates, validates, activates, monitors, and re-probes employers without manual intervention.
 */
import type { PrismaClient } from '@prisma/client';
import type { EmployerAtsIntelligence } from '@prisma/client';
import type { ScrapeService } from '../services/scrape.service.js';
import { ActivationRepository } from '../repositories/activation-repository.js';
import { ACTIVATION_THRESHOLDS } from './activation-states.js';
import { validateSampleCrawl } from './validation-service.js';
import { runSampleCrawl, testApiEndpoint } from './sample-crawl.js';
import { refreshHealthForEmployer } from './health-service.js';
import { onboardEmployer } from './employer-onboarding.js';
import { logger } from '../lib/logger.js';

export interface ActivationDecision {
  employerId: string;
  sourceName: string | null;
  companyName: string;
  decision: 'ACTIVATED' | 'VALIDATED' | 'READY' | 'REJECTED' | 'DEACTIVATED' | 'REPROBED' | 'RETRY_SCHEDULED';
  reason: string;
  confidence: number;
  sampleQuality?: number;
  health?: number;
}

export class EmployerActivationEngine {
  private readonly activationRepo: ActivationRepository;

  constructor(
    private readonly db: PrismaClient,
    private readonly scrapeService: ScrapeService,
  ) {
    this.activationRepo = new ActivationRepository(db);
  }

  async evaluateEmployer(intel: EmployerAtsIntelligence): Promise<ActivationDecision> {
    if (!intel.sourceName) {
      return this.reject(intel, 'No sourceName — cannot activate unregistered employer');
    }

    const sourceName = intel.sourceName;

    if (intel.activationState === 'PROBED' && intel.confidence >= 70) {
      await this.activationRepo.transition(intel.id, 'READY', {
        reason: `Probe confidence ${intel.confidence} — ready for validation`,
        automatic: true,
      });
      intel = { ...intel, activationState: 'READY' };
    }

    if (isUnknownSource(intel)) {
      return this.reject(intel, 'Unknown ATS/source — requires manual investigation');
    }

    if (!intel.robotsAllowed) {
      await this.activationRepo.scheduleRetry(intel.id);
      return this.decision(intel, 'RETRY_SCHEDULED', 'robots.txt disallows crawling');
    }

    const apiWorks = await this.checkEndpoints(intel);
    const sample = await runSampleCrawl(this.scrapeService, sourceName);
    const validation = validateSampleCrawl(sample.jobs, {
      minJobs: intel.crawlStrategy === 'api' ? 1 : 1,
    });

    await this.db.employerAtsIntelligence.update({
      where: { id: intel.id },
      data: {
        validationScore: validation.score,
        lastValidationAt: new Date(),
        validationSummary: validation as unknown as object,
      },
    });

    const domWorked = sample.jobsFound > 0;
    const extractionOk = apiWorks || domWorked;

    if (intel.confidence >= ACTIVATION_THRESHOLDS.AUTO_ACTIVATE_CONFIDENCE &&
        extractionOk &&
        validation.passed &&
        validation.score >= ACTIVATION_THRESHOLDS.VALIDATION_QUALITY_MIN) {
      return this.activate(intel, validation.score, sample.jobsFound, apiWorks);
    }

    if (validation.passed && extractionOk) {
      await this.activationRepo.transition(intel.id, 'VALIDATED', {
        reason: `Sample validation passed (${validation.score}/100)`,
        automatic: true,
        validationScore: validation.score,
        validationSummary: validation as unknown as object,
      });
      await this.activationRepo.transition(intel.id, 'READY', {
        reason: `Awaiting confidence ≥${ACTIVATION_THRESHOLDS.AUTO_ACTIVATE_CONFIDENCE} (current ${intel.confidence})`,
        automatic: true,
        validationScore: validation.score,
      });
      return this.decision(
        intel,
        'READY',
        `Validated (${validation.score}/100) but confidence ${intel.confidence} < ${ACTIVATION_THRESHOLDS.AUTO_ACTIVATE_CONFIDENCE}`,
        validation.score,
      );
    }

    await this.activationRepo.scheduleRetry(intel.id);
    await this.activationRepo.adjustConfidence(intel.id, -5);
    return this.decision(
      intel,
      'RETRY_SCHEDULED',
      `Validation failed: ${validation.issues.join('; ') || 'quality below threshold'}`,
      validation.score,
    );
  }

  async activateReadyEmployers(limit = 20): Promise<ActivationDecision[]> {
    const ready = await this.activationRepo.findByState(['READY', 'VALIDATED'], limit);
    const decisions: ActivationDecision[] = [];

    for (const intel of ready) {
      const decision = await this.evaluateEmployer(intel);
      decisions.push(decision);
      this.logDecision(decision);
    }

    return decisions;
  }

  async runValidationCrawls(limit = 15): Promise<ActivationDecision[]> {
    const targets = await this.db.employerAtsIntelligence.findMany({
      where: {
        sourceName: { not: null },
        OR: [
          { activationState: { in: ['READY', 'VALIDATED', 'PROBED'] } },
        ],
        confidence: { gte: 60 },
      },
      orderBy: { confidence: 'desc' },
      take: limit,
    });

    const decisions: ActivationDecision[] = [];
    for (const intel of targets) {
      const decision = await this.evaluateEmployer(intel);
      decisions.push(decision);
      this.logDecision(decision);
    }
    return decisions;
  }

  async retryReadyEmployers(): Promise<ActivationDecision[]> {
    const due = await this.activationRepo.findDueRetries();
    const decisions: ActivationDecision[] = [];

    for (const intel of due) {
      try {
        const report = await onboardEmployer(intel.inputUrl, intel.companyName);
        const confidenceDelta = report.confidenceScore > intel.confidence ? 5 : -3;
        await this.activationRepo.adjustConfidence(intel.id, confidenceDelta);

        await this.db.employerAtsIntelligence.update({
          where: { id: intel.id },
          data: {
            confidence: report.confidenceScore,
            atsPlatform: report.atsDetected,
            crawlStrategy: report.crawlStrategy,
            apiEndpoints: report.apiEndpoints,
            careersPageUrl: report.careersPageUrl,
            robotsAllowed: report.robotsAllowed,
            activationState: report.confidenceScore >= 70 ? 'READY' : 'PROBED',
          },
        });

        if (report.confidenceScore >= ACTIVATION_THRESHOLDS.AUTO_ACTIVATE_CONFIDENCE) {
          const updated = await this.db.employerAtsIntelligence.findUnique({ where: { id: intel.id } });
          if (updated) {
            const decision = await this.evaluateEmployer(updated);
            decisions.push(decision);
            this.logDecision(decision);
            continue;
          }
        }

        await this.activationRepo.scheduleRetry(intel.id);
        decisions.push(this.decision(intel, 'REPROBED', `Re-probed: confidence now ${report.confidenceScore}`));
      } catch (err) {
        await this.activationRepo.adjustConfidence(intel.id, -5);
        await this.activationRepo.scheduleRetry(intel.id);
        decisions.push(
          this.decision(intel, 'RETRY_SCHEDULED', `Re-probe failed: ${err instanceof Error ? err.message : err}`),
        );
      }
    }

    return decisions;
  }

  async recalculateHealth(limit = 30): Promise<ActivationDecision[]> {
    const active = await this.activationRepo.findActiveForHealthCheck(limit);
    const decisions: ActivationDecision[] = [];

    for (const intel of active) {
      const report = await refreshHealthForEmployer(this.db, intel.id);
      if (!report) continue;

      if (report.needsDeactivation) {
        await this.activationRepo.transition(intel.id, 'READY', {
          reason: `Health dropped to ${report.healthScore}`,
          automatic: true,
          deactivationReason: report.issues.join('; '),
          healthScore: report.healthScore,
        });
        decisions.push(this.decision(intel, 'DEACTIVATED', report.issues.join('; '), undefined, report.healthScore));
      } else if (report.healthScore >= ACTIVATION_THRESHOLDS.HEALTH_MONITORED_MIN) {
        await this.activationRepo.transition(intel.id, 'MONITORED', {
          reason: `Healthy: ${report.healthScore}/100`,
          automatic: true,
          healthScore: report.healthScore,
        });
        decisions.push(this.decision(intel, 'ACTIVATED', `Monitored at health ${report.healthScore}`, undefined, report.healthScore));
      } else if (report.needsReprobe) {
        const reprobe = await this.reProbeEmployer(intel);
        decisions.push(reprobe);
      } else {
        decisions.push(this.decision(intel, 'ACTIVATED', `Health ${report.healthScore}`, undefined, report.healthScore));
      }

      this.logDecision(decisions[decisions.length - 1]!);
    }

    return decisions;
  }

  async reProbeEmployer(intel: EmployerAtsIntelligence): Promise<ActivationDecision> {
    const report = await onboardEmployer(intel.inputUrl, intel.companyName);
    const confidenceDrop = intel.confidence - report.confidenceScore;

    await this.db.employerAtsIntelligence.update({
      where: { id: intel.id },
      data: {
        confidence: report.confidenceScore,
        atsPlatform: report.atsDetected,
        crawlStrategy: report.crawlStrategy,
        apiEndpoints: report.apiEndpoints,
        careersPageUrl: report.careersPageUrl,
        robotsAllowed: report.robotsAllowed,
        probedAt: new Date(),
        probeVersion: { increment: 1 },
      },
    });

    if (confidenceDrop >= ACTIVATION_THRESHOLDS.REPROBE_CONFIDENCE_DROP) {
      await this.activationRepo.transition(intel.id, 'READY', {
        reason: `Re-probe: confidence dropped ${confidenceDrop} points`,
        automatic: true,
        deactivationReason: 'Endpoint or site structure may have changed',
      });
    }

    return this.decision(
      intel,
      'REPROBED',
      `ATS ${report.atsDetected}, confidence ${report.confidenceScore}`,
    );
  }

  getMetrics() {
    return this.activationRepo.getMetrics();
  }

  private async activate(
    intel: EmployerAtsIntelligence,
    sampleQuality: number,
    jobCount: number,
    apiWorks: boolean,
  ): Promise<ActivationDecision> {
    const reason = apiWorks
      ? `${intel.atsPlatform} endpoint validated with ${jobCount} jobs`
      : `DOM crawler extracted ${jobCount} jobs successfully`;

    await this.activationRepo.transition(intel.id, 'ACTIVE', {
      reason,
      automatic: true,
      activationReason: reason,
      validationScore: sampleQuality,
    });

    if (intel.sourceName) {
      await this.db.sourceProfile.update({
        where: { sourceName: intel.sourceName },
        data: { status: 'active', activationState: 'ACTIVE' },
      }).catch(() => undefined);
    }

    return this.decision(intel, 'ACTIVATED', reason, sampleQuality);
  }

  private async checkEndpoints(intel: EmployerAtsIntelligence): Promise<boolean> {
    if (intel.crawlStrategy !== 'api' && intel.crawlStrategy !== 'hybrid') return false;
    const endpoints = intel.apiEndpoints.filter((e) => e.startsWith('http'));
    if (endpoints.length === 0) return false;
    for (const url of endpoints.slice(0, 3)) {
      if (await testApiEndpoint(url)) return true;
    }
    return false;
  }

  private reject(intel: EmployerAtsIntelligence, reason: string): ActivationDecision {
    return this.decision(intel, 'REJECTED', reason);
  }

  private decision(
    intel: EmployerAtsIntelligence,
    decision: ActivationDecision['decision'],
    reason: string,
    sampleQuality?: number,
    health?: number,
  ): ActivationDecision {
    return {
      employerId: intel.id,
      sourceName: intel.sourceName,
      companyName: intel.companyName,
      decision,
      reason,
      confidence: intel.confidence,
      sampleQuality,
      health,
    };
  }

  private logDecision(d: ActivationDecision): void {
    logger.info(
      {
        company: d.companyName,
        source: d.sourceName,
        decision: d.decision,
        confidence: d.confidence,
        sampleQuality: d.sampleQuality,
        health: d.health,
        reason: d.reason,
      },
      `Employer activation: ${d.decision}`,
    );
  }
}

function isUnknownSource(intel: EmployerAtsIntelligence): boolean {
  return (
    intel.atsPlatform === 'custom' &&
    intel.confidence < ACTIVATION_THRESHOLDS.AUTO_ACTIVATE_CONFIDENCE &&
    intel.crawlStrategy === 'dom' &&
    intel.estimatedJobVolume === 'unknown'
  );
}

export async function syncProductionStateAfterCrawl(
  db: PrismaClient,
  sourceName: string,
  jobsFound: number,
): Promise<void> {
  if (jobsFound === 0) return;

  const intel = await db.employerAtsIntelligence.findFirst({
    where: { sourceName },
    orderBy: { probedAt: 'desc' },
  });
  if (!intel) return;

  const repo = new ActivationRepository(db);
  if (['ACTIVE', 'MONITORED'].includes(intel.activationState)) return;

  if (jobsFound > 0 && intel.confidence >= 60) {
    await repo.transition(intel.id, 'ACTIVE', {
      reason: `Production crawl found ${jobsFound} jobs`,
      automatic: true,
      activationReason: 'Activated after successful production crawl',
    });
  }
}
