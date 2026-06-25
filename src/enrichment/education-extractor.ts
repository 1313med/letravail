const EDUCATION_PATTERNS: Array<{ pattern: RegExp; level: string; priority: number }> = [
  { pattern: /\bdoctorat\b/i, level: 'Doctorat', priority: 10 },
  { pattern: /\bphd\b/i, level: 'Doctorat', priority: 10 },
  { pattern: /\bthèse\b/i, level: 'Doctorat', priority: 9 },
  { pattern: /\bingénieur\b/i, level: 'Ingénieur', priority: 8 },
  { pattern: /\bengineering\s+degree\b/i, level: 'Ingénieur', priority: 8 },
  { pattern: /\bmaster\b/i, level: 'Master', priority: 7 },
  { pattern: /\bmba\b/i, level: 'Master', priority: 7 },
  { pattern: /\bbac\s*\+\s*5\b/i, level: 'Bac+5', priority: 6 },
  { pattern: /\bbac\s*\+\s*3\b/i, level: 'Bac+3', priority: 5 },
  { pattern: /\blicence\b/i, level: 'Bac+3', priority: 5 },
  { pattern: /\bbachelor\b/i, level: 'Bac+3', priority: 5 },
  { pattern: /\bbac\s*\+\s*2\b/i, level: 'Bac+2', priority: 4 },
  { pattern: /\bbts\b/i, level: 'Bac+2', priority: 4 },
  { pattern: /\bdut\b/i, level: 'Bac+2', priority: 4 },
  { pattern: /\bdeug\b/i, level: 'Bac+2', priority: 4 },
  { pattern: /\bbac\b(?!\+)/i, level: 'Bac', priority: 3 },
  { pattern: /\bbaccalauréat\b/i, level: 'Bac', priority: 3 },
];

export function extractEducationLevel(text: string): string | undefined {
  let best: { level: string; priority: number } | undefined;

  for (const { pattern, level, priority } of EDUCATION_PATTERNS) {
    if (pattern.test(text) && (!best || priority > best.priority)) {
      best = { level, priority };
    }
  }

  return best?.level;
}
