import {
  CANONICAL_SKILLS,
  aliasToPattern,
  type ExtractedSkill,
  type CanonicalSkill,
} from './skills-catalog.js';

/** Skills sorted by longest alias first to prefer specific matches */
const SORTED_SKILLS: Array<CanonicalSkill & { patterns: RegExp[] }> = CANONICAL_SKILLS.map(
  (skill) => ({
    ...skill,
    patterns: [...skill.aliases]
      .sort((a, b) => b.length - a.length)
      .map(aliasToPattern),
  }),
);

const MIN_TEXT_LENGTH = 10;

/** Short aliases that need extra context to avoid false positives */
const SHORT_ALIAS_GUARD = new Set(['js', 'ts', 'ml', 'ai', 'go', 'r', 'c']);

export function extractSkills(text: string): ExtractedSkill[] {
  if (!text || text.length < MIN_TEXT_LENGTH) return [];

  const normalized = normalizeForMatching(text);
  const found = new Map<string, ExtractedSkill>();

  for (const skill of SORTED_SKILLS) {
    if (found.has(skill.slug)) continue;

    for (let i = 0; i < skill.aliases.length; i++) {
      const alias = skill.aliases[i]!;
      const pattern = skill.patterns[i]!;

      if (SHORT_ALIAS_GUARD.has(alias.toLowerCase()) && !isShortAliasSafe(alias, normalized)) {
        continue;
      }

      if (!pattern.test(normalized)) continue;

      const confidence = computeConfidence(normalized, skill, alias);
      if (confidence < 0.55) continue;

      found.set(skill.slug, {
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        confidence,
        matchedAlias: alias,
      });
      break;
    }
  }

  return [...found.values()].sort((a, b) => b.confidence - a.confidence);
}

function normalizeForMatching(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')} `;
}

function isShortAliasSafe(alias: string, text: string): boolean {
  const a = alias.toLowerCase();
  if (a === 'js' || a === 'ts') {
    return /\b(javascript|typescript|node|react|angular|vue)\b/i.test(text);
  }
  if (a === 'go') return /\b(golang|go lang)\b/i.test(text);
  if (a === 'ml' || a === 'ai') {
    return /\b(machine learning|deep learning|intelligence artificielle|data science)\b/i.test(text);
  }
  return true;
}

function computeConfidence(text: string, skill: CanonicalSkill, matchedAlias: string): number {
  let score = 0.6;
  const aliasLen = matchedAlias.length;

  if (aliasLen >= 8) score += 0.15;
  else if (aliasLen >= 5) score += 0.1;

  const occurrences = (text.match(new RegExp(aliasToPattern(matchedAlias).source, 'gi')) ?? []).length;
  if (occurrences > 1) score += 0.1;

  const inFirstChunk = aliasToPattern(matchedAlias).test(text.slice(0, 300));
  if (inFirstChunk) score += 0.1;

  if (skill.category === 'finance' || skill.category === 'business') {
    score += 0.05;
  }

  return Math.min(score, 1);
}

/** Report skill coverage stats for a set of job descriptions */
export function measureSkillCoverage(
  jobs: Array<{ description: string; title?: string }>,
): { total: number; withSkills: number; coverage: number; skillCounts: Map<string, number> } {
  const skillCounts = new Map<string, number>();
  let withSkills = 0;

  for (const job of jobs) {
    const text = `${job.title ?? ''}\n${job.description}`;
    const skills = extractSkills(text);
    if (skills.length > 0) withSkills++;
    for (const s of skills) {
      skillCounts.set(s.slug, (skillCounts.get(s.slug) ?? 0) + 1);
    }
  }

  return {
    total: jobs.length,
    withSkills,
    coverage: jobs.length ? withSkills / jobs.length : 0,
    skillCounts,
  };
}
