import { createHash } from 'node:crypto';

export function generateContentHash(
  title: string,
  description: string,
  requirements?: string | null,
): string {
  const payload = [title.trim(), description.trim(), (requirements ?? '').trim()].join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

export function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupFingerprint(
  title: string,
  company: string,
  city: string,
): string {
  return createHash('sha256')
    .update([normalizeForDedup(title), normalizeForDedup(company), normalizeForDedup(city)].join('|'))
    .digest('hex')
    .slice(0, 24);
}
