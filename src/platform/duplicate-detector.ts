/**
 * Cross-source duplicate detection — same role across LinkedIn + employer sites.
 */
import type { PrismaClient } from '@prisma/client';
import { dedupFingerprint } from '../utils/content-hash.js';

export interface DuplicateCandidate {
  jobId: string;
  source: string;
  title: string;
  company: string;
  city: string;
  fingerprint: string;
  duplicateOfId: string;
  duplicateOfSource: string;
  confidence: number;
}

export async function findCrossSourceDuplicates(
  db: PrismaClient,
  limit = 100,
): Promise<DuplicateCandidate[]> {
  const jobs = await db.job.findMany({
    where: { isActive: true },
    select: { id: true, source: true, title: true, company: true, city: true },
    take: 5000,
  });

  const byFingerprint = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const fp = dedupFingerprint(job.title, job.company, job.city);
    const group = byFingerprint.get(fp) ?? [];
    group.push(job);
    byFingerprint.set(fp, group);
  }

  const candidates: DuplicateCandidate[] = [];
  for (const [, group] of byFingerprint) {
    if (group.length < 2) continue;
    const sources = new Set(group.map((j) => j.source));
    if (sources.size < 2) continue;

    const primary = group.find((j) => j.source !== 'linkedin') ?? group[0]!;
    for (const job of group) {
      if (job.id === primary.id) continue;
      candidates.push({
        jobId: job.id,
        source: job.source,
        title: job.title,
        company: job.company,
        city: job.city,
        fingerprint: dedupFingerprint(job.title, job.company, job.city),
        duplicateOfId: primary.id,
        duplicateOfSource: primary.source,
        confidence: job.source === 'linkedin' ? 0.75 : 0.85,
      });
      if (candidates.length >= limit) return candidates;
    }
  }

  return candidates;
}

export async function flagDuplicatesInBatch(
  db: PrismaClient,
  jobIds: string[],
): Promise<number> {
  const jobs = await db.job.findMany({
    where: { id: { in: jobIds }, isActive: true },
    select: { id: true, title: true, company: true, city: true, extractionMetadata: true },
  });

  let flagged = 0;
  for (const job of jobs) {
    const fp = dedupFingerprint(job.title, job.company, job.city);
    const match = await db.job.findFirst({
      where: {
        isActive: true,
        id: { not: job.id },
        title: { equals: job.title, mode: 'insensitive' },
        company: { equals: job.company, mode: 'insensitive' },
        city: { equals: job.city, mode: 'insensitive' },
      },
      select: { id: true, source: true },
    });
    if (!match) continue;

    const meta = (job.extractionMetadata as Record<string, unknown>) ?? {};
    await db.job.update({
      where: { id: job.id },
      data: {
        extractionMetadata: {
          ...meta,
          duplicateCandidate: {
            ofJobId: match.id,
            ofSource: match.source,
            fingerprint: fp,
            detectedAt: new Date().toISOString(),
          },
        },
      },
    });
    flagged++;
  }
  return flagged;
}
