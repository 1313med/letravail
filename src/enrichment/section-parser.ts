/**
 * Parse structured sections from job description text (FR/EN).
 */
export interface ParsedSections {
  body: string;
  requirements?: string;
  benefits?: string;
  responsibilities?: string;
  profile?: string;
}

const SECTION_HEADERS = [
  { key: 'requirements' as const, patterns: [/^(?:profil|profile|qualifications?|requirements?|compétences|competences|skills required|what you bring|votre profil)\s*:?\s*$/im] },
  { key: 'benefits' as const, patterns: [/^(?:avantages|benefits|perks|what we offer|ce que nous offrons|pourquoi nous rejoindre)\s*:?\s*$/im] },
  { key: 'responsibilities' as const, patterns: [/^(?:missions?|responsabilités|responsibilities|vos missions|job purpose|description du poste|role description)\s*:?\s*$/im] },
  { key: 'profile' as const, patterns: [/^(?:profil recherché|candidate profile|who you are)\s*:?\s*$/im] },
];

export function parseJobSections(text: string): ParsedSections {
  if (!text || text.length < 50) return { body: text };

  const lines = text.split(/\n+/);
  const sections: Record<string, string[]> = { body: [] };
  let current = 'body';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const header of SECTION_HEADERS) {
      if (header.patterns.some((p) => p.test(trimmed))) {
        current = header.key;
        if (!sections[current]) sections[current] = [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!sections[current]) sections[current] = [];
      sections[current].push(trimmed);
    }
  }

  const join = (key: string) => sections[key]?.join('\n').trim();

  return {
    body: join('body') || text,
    requirements: join('requirements') || join('profile'),
    benefits: join('benefits'),
    responsibilities: join('responsibilities'),
    profile: join('profile'),
  };
}
