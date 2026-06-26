/**
 * Duplicate intelligence — prefer official employer source over LinkedIn aggregator.
 */
import type { PrismaClient } from '@prisma/client';
import { dedupFingerprint } from '../utils/content-hash.js';
import { logger } from '../lib/logger.js';

const AGGREGATOR_SOURCES = new Set(['linkedin', 'anapec']);

const SOURCE_PRIORITY: Record<string, number> = {
  'cih-bank': 100,
  'attijariwafa-bank': 100,
  'banque-populaire': 95,
  'credit-du-maroc': 95,
  'intelcia': 90,
  'teleperformance-maroc': 90,
  linkedin: 20,
  anapec: 30,
};

export function sourcePriority(source: string): number {
  return SOURCE_PRIORITY[source] ?? (AGGREGATOR_SOURCES.has(source) ? 25 : 70);
}

export interface MergeResult {
  kept: number;
  archived: number;
  merged: Array<{ archivedId: string; keptId: string; reason: string }>;
}

export async function mergeDuplicateJobs(db: PrismaClient): Promise<MergeResult> {
  const active = await db.job.findMany({
    where: { isActive: true },
    select: {
      id: true,
      source: true,
      title: true,
      company: true,
      city: true,
      description: true,
      rawHtml: true,
      requirements: true,
      qualityScore: true,
      applicationUrl: true,
      contentHash: true,
    },
    take: 5000,
  });

  const byFingerprint = new Map<string, typeof active>();
  for (const job of active) {
    const fp = dedupFingerprint(job.title, job.company, job.city);
    const group = byFingerprint.get(fp) ?? [];
    group.push(job);
    byFingerprint.set(fp, group);
  }

  const result: MergeResult = { kept: 0, archived: 0, merged: [] };

  for (const [, group] of byFingerprint) {
    if (group.length < 2) continue;

    const sorted = [...group].sort((a, b) => {
      const prioDiff = sourcePriority(b.source) - sourcePriority(a.source);
      if (prioDiff !== 0) return prioDiff;
      const descDiff = b.description.length - a.description.length;
      if (descDiff !== 0) return descDiff;
      return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
    });

    const canonical = sorted[0]!;
    for (const dup of sorted.slice(1)) {
      if (dup.id === canonical.id) continue;

      const shouldArchive = sourcePriority(dup.source) <= sourcePriority(canonical.source);
      if (!shouldArchive) continue;

      if (dup.description.length > canonical.description.length + 200) {
        await db.job.update({
          where: { id: canonical.id },
          data: {
            description: dup.description,
            requirements: dup.requirements ?? canonical.requirements,
            rawHtml: dup.rawHtml ?? canonical.rawHtml,
          },
        });
      }

      await db.job.update({
        where: { id: dup.id },
        data: {
          isActive: false,
          archivedAt: new Date(),
          extractionMetadata: {
            mergedInto: canonical.id,
            mergedAt: new Date().toISOString(),
            reason: 'duplicate_intelligence',
            canonicalSource: canonical.source,
          },
        },
      });

      result.archived++;
      result.merged.push({
        archivedId: dup.id,
        keptId: canonical.id,
        reason: `${dup.source} → ${canonical.source}`,
      });
    }
    result.kept++;
  }

  if (result.archived > 0) {
    logger.info({ archived: result.archived, groups: result.kept }, 'Duplicate merge completed');
  }

  return result;
}
