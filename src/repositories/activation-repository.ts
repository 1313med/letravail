import type { Prisma, PrismaClient } from '@prisma/client';
import type { ActivationState } from '../platform/activation-states.js';
import { ACTIVATION_THRESHOLDS } from '../platform/activation-states.js';

export interface StateTransition {
  employerId: string;
  sourceName: string | null;
  companyName: string;
  from: string;
  to: ActivationState;
  reason: string;
  automatic: boolean;
}

export class ActivationRepository {
  constructor(private readonly db: PrismaClient) {}

  async transition(
    id: string,
    to: ActivationState,
    opts: {
      reason: string;
      automatic?: boolean;
      validationScore?: number;
      validationSummary?: Prisma.InputJsonValue;
      healthScore?: number;
      activationReason?: string;
      deactivationReason?: string;
    },
  ) {
    const current = await this.db.employerAtsIntelligence.findUnique({ where: { id } });
    if (!current) throw new Error(`Employer intelligence not found: ${id}`);

    const data: Prisma.EmployerAtsIntelligenceUpdateInput = {
      activationState: to,
      onboardingStatus: mapStateToLegacyStatus(to),
      ...(opts.validationScore !== undefined && {
        validationScore: opts.validationScore,
        lastValidationAt: new Date(),
      }),
      ...(opts.validationSummary !== undefined && { validationSummary: opts.validationSummary }),
      ...(opts.healthScore !== undefined && {
        healthScore: opts.healthScore,
        lastHealthCheck: new Date(),
      }),
      ...(opts.activationReason && { activationReason: opts.activationReason }),
      ...(opts.deactivationReason && { deactivationReason: opts.deactivationReason }),
      ...(opts.automatic !== undefined && { automaticActivation: opts.automatic }),
    };

    const updated = await this.db.employerAtsIntelligence.update({ where: { id }, data });

    if (current.sourceName) {
      await this.syncSourceProfileState(current.sourceName, to, opts);
    }

    return updated;
  }

  async scheduleRetry(id: string, hours = ACTIVATION_THRESHOLDS.RETRY_INTERVAL_HOURS) {
    const nextRetryAt = new Date(Date.now() + hours * 3_600_000);
    return this.db.employerAtsIntelligence.update({
      where: { id },
      data: {
        nextRetryAt,
        retryCount: { increment: 1 },
      },
    });
  }

  async adjustConfidence(id: string, delta: number) {
    const row = await this.db.employerAtsIntelligence.findUnique({ where: { id } });
    if (!row) return null;
    const confidence = Math.max(0, Math.min(100, row.confidence + delta));
    return this.db.employerAtsIntelligence.update({
      where: { id },
      data: { confidence },
    });
  }

  async findByState(states: ActivationState[], limit = 50) {
    return this.db.employerAtsIntelligence.findMany({
      where: { activationState: { in: states } },
      orderBy: [{ confidence: 'desc' }, { probedAt: 'desc' }],
      take: limit,
    });
  }

  async findDueRetries(now = new Date()) {
    return this.db.employerAtsIntelligence.findMany({
      where: {
        activationState: { in: ['READY', 'VALIDATED', 'PROBED'] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        retryCount: { lt: ACTIVATION_THRESHOLDS.MAX_RETRIES },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: 20,
    });
  }

  async findActiveForHealthCheck(limit = 30) {
    return this.db.employerAtsIntelligence.findMany({
      where: { activationState: { in: ['ACTIVE', 'MONITORED'] } },
      orderBy: { lastHealthCheck: 'asc' },
      take: limit,
    });
  }

  async getMetrics() {
    const byState = await this.db.employerAtsIntelligence.groupBy({
      by: ['activationState'],
      _count: true,
    });
    const avgValidation = await this.db.employerAtsIntelligence.aggregate({
      _avg: { validationScore: true },
      where: { validationScore: { not: null } },
    });
    const avgHealth = await this.db.employerAtsIntelligence.aggregate({
      _avg: { healthScore: true },
      where: { healthScore: { not: null } },
    });
    const autoActivated = await this.db.employerAtsIntelligence.count({
      where: { automaticActivation: true, activationState: { in: ['ACTIVE', 'MONITORED'] } },
    });
    const retryQueue = await this.db.employerAtsIntelligence.count({
      where: {
        activationState: { in: ['READY', 'VALIDATED', 'PROBED'] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
    });
    const validationQueue = await this.db.employerAtsIntelligence.count({
      where: { activationState: { in: ['READY', 'VALIDATED'] }, validationScore: null },
    });

    return {
      byState: Object.fromEntries(byState.map((r) => [r.activationState, r._count])),
      avgValidationScore: Math.round(avgValidation._avg.validationScore ?? 0),
      avgHealthScore: Math.round(avgHealth._avg.healthScore ?? 0),
      automaticActivations: autoActivated,
      retryQueue,
      validationQueue,
    };
  }

  private async syncSourceProfileState(
    sourceName: string,
    state: ActivationState,
    opts: { healthScore?: number; activationReason?: string; deactivationReason?: string },
  ) {
    const profile = await this.db.sourceProfile.findUnique({ where: { sourceName } });
    if (!profile) return;

    const isProduction = state === 'ACTIVE' || state === 'MONITORED';
    await this.db.sourceProfile.update({
      where: { sourceName },
      data: {
        activationState: state,
        status: isProduction ? 'active' : state === 'READY' ? 'planned' : 'stale',
        ...(opts.healthScore !== undefined && {
          healthScore: opts.healthScore,
          lastHealthUpdate: new Date(),
        }),
      },
    });
  }
}

function mapStateToLegacyStatus(state: ActivationState): string {
  switch (state) {
    case 'ACTIVE':
    case 'MONITORED':
      return 'active';
    case 'READY':
    case 'VALIDATED':
      return 'ready';
    default:
      return 'probed';
  }
}
