import type { Job } from '../types/job.js';

/** Composite freshness score for pipeline prioritization (0–100). */
export function computeFreshnessScore(job: Job): number {
  const now = Date.now();
  const published = job.publishedAt?.getTime() ?? job.sourcePublishedAt?.getTime() ?? 0;
  const firstSeen = job.firstSeenAt?.getTime() ?? published;
  const lastVerified = job.lastVerifiedAt?.getTime() ?? job.lastSeenAt?.getTime() ?? firstSeen;

  const pubAge = published > 0 ? (now - published) / 86_400_000 : 30;
  const verifyAge = lastVerified > 0 ? (now - lastVerified) / 86_400_000 : 30;

  const pubScore = Math.max(0, 100 - pubAge * 4);
  const verifyScore = Math.max(0, 100 - verifyAge * 6);
  const qualityBoost = (job as { qualityScore?: number }).qualityScore ?? 50;

  return Math.round(pubScore * 0.45 + verifyScore * 0.35 + qualityBoost * 0.2);
}

export function rankJobsByFreshness<T extends Job>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const scoreA = computeFreshnessScore(a);
    const scoreB = computeFreshnessScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;

    const pubA = a.publishedAt?.getTime() ?? a.firstSeenAt?.getTime() ?? 0;
    const pubB = b.publishedAt?.getTime() ?? b.firstSeenAt?.getTime() ?? 0;
    if (pubB !== pubA) return pubB - pubA;

    const seenA = a.lastVerifiedAt?.getTime() ?? a.lastSeenAt?.getTime() ?? 0;
    const seenB = b.lastVerifiedAt?.getTime() ?? b.lastSeenAt?.getTime() ?? 0;
    return seenB - seenA;
  });
}
