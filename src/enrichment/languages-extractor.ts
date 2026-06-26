const LANGUAGE_PATTERNS: Array<{ name: string; patterns: RegExp[] }> = [
  { name: 'French', patterns: [/\bfrançais\b/i, /\bfrench\b/i, /\blangue\s+française\b/i] },
  { name: 'English', patterns: [/\banglais\b/i, /\benglish\b/i, /\bfluent\s+english\b/i] },
  { name: 'Arabic', patterns: [/\barabe\b/i, /\barabic\b/i, /\blangue\s+arabe\b/i] },
  { name: 'Spanish', patterns: [/\bespañol\b/i, /\bspanish\b/i, /\bespagnol\b/i] },
  { name: 'German', patterns: [/\ballemand\b/i, /\bgerman\b/i] },
  { name: 'Italian', patterns: [/\bitalien\b/i, /\bitalian\b/i] },
  { name: 'Dutch', patterns: [/\bnéerlandais\b/i, /\bdutch\b/i] },
  { name: 'Portuguese', patterns: [/\bportugais\b/i, /\bportuguese\b/i] },
];

const LEVEL_PATTERNS = [
  { level: 'Native', pattern: /\b(langue\s+maternelle|native|bilingue|bilingual)\b/i },
  { level: 'Fluent', pattern: /\b(courant|fluent|professional)\b/i },
  { level: 'Intermediate', pattern: /\b(intermédiaire|intermediate|bon niveau)\b/i },
  { level: 'Basic', pattern: /\b(notion|basic|débutant|beginner)\b/i },
];

export function extractLanguages(text: string): Array<{ name: string; level?: string; confidence: number }> {
  const found: Array<{ name: string; level?: string; confidence: number }> = [];

  for (const lang of LANGUAGE_PATTERNS) {
    if (lang.patterns.some((p) => p.test(text))) {
      let level: string | undefined;
      for (const lp of LEVEL_PATTERNS) {
        if (lp.pattern.test(text)) { level = lp.level; break; }
      }
      found.push({ name: lang.name, level, confidence: 0.85 });
    }
  }

  return found;
}
