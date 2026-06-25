import { SKILLS_CATALOG, type ExtractedSkill } from './skills-catalog.js';

export function extractSkills(text: string): ExtractedSkill[] {
  if (!text || text.length < 10) return [];

  const found = new Map<string, ExtractedSkill>();

  for (const skill of SKILLS_CATALOG) {
    for (const pattern of skill.patterns) {
      if (pattern.test(text)) {
        const existing = found.get(skill.slug);
        const confidence = computeConfidence(text, skill.name, pattern);
        if (!existing || confidence > existing.confidence) {
          found.set(skill.slug, {
            name: skill.name,
            slug: skill.slug,
            category: skill.category,
            confidence,
          });
        }
        break;
      }
    }
  }

  return [...found.values()].sort((a, b) => b.confidence - a.confidence);
}

function computeConfidence(text: string, skillName: string, pattern: RegExp): number {
  const matches = text.match(new RegExp(pattern.source, 'gi'));
  const count = matches?.length ?? 0;
  const inTitle = new RegExp(pattern.source, 'i').test(text.slice(0, 200));
  let score = 0.6;
  if (count > 1) score += 0.1;
  if (inTitle) score += 0.15;
  if (text.toLowerCase().includes(skillName.toLowerCase())) score += 0.1;
  return Math.min(score, 1);
}
