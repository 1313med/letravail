export interface ExtractedExperience {
  experienceLevel?: string;
  experienceYears?: string;
}

const YEARS_PATTERNS: Array<{ pattern: RegExp; years: string }> = [
  { pattern: /\b0\s*[-–àa]\s*2\s*ans?\b/i, years: '0-2' },
  { pattern: /\b1\s*[-–àa]\s*2\s*ans?\b/i, years: '0-2' },
  { pattern: /\b2\s*[-–àa]\s*5\s*ans?\b/i, years: '2-5' },
  { pattern: /\b3\s*[-–àa]\s*5\s*ans?\b/i, years: '2-5' },
  { pattern: /\b5\s*\+?\s*ans?\b/i, years: '5+' },
  { pattern: /\bplus\s+de\s+5\s+ans?\b/i, years: '5+' },
  { pattern: /\bminimum\s+(\d+)\s+ans?\b/i, years: 'custom' },
  { pattern: /\b(\d+)\s*[-–àa]\s*(\d+)\s*ans?\s+d['']expérience\b/i, years: 'custom' },
  { pattern: /\b(\d+)\s+ans?\s+d['']expérience\b/i, years: 'custom' },
];

const LEVEL_PATTERNS: Array<{ pattern: RegExp; level: string }> = [
  { pattern: /\bjunior\b/i, level: 'Junior' },
  { pattern: /\bdébutant\b/i, level: 'Junior' },
  { pattern: /\bconfirmé\b/i, level: 'Mid' },
  { pattern: /\bintermédiaire\b/i, level: 'Mid' },
  { pattern: /\bsenior\b/i, level: 'Senior' },
  { pattern: /\bsénior\b/i, level: 'Senior' },
  { pattern: /\bexpert\b/i, level: 'Senior' },
  { pattern: /\bcadre\b/i, level: 'Senior' },
  { pattern: /\bstage\b/i, level: 'Junior' },
  { pattern: /\bstagiaire\b/i, level: 'Junior' },
];

export function extractExperience(text: string, title = ''): ExtractedExperience {
  const combined = `${title}\n${text}`;
  const result: ExtractedExperience = {};

  for (const { pattern, level } of LEVEL_PATTERNS) {
    if (pattern.test(combined)) {
      result.experienceLevel = level;
      break;
    }
  }

  for (const { pattern, years } of YEARS_PATTERNS) {
    const match = combined.match(pattern);
    if (!match) continue;

    if (years === 'custom') {
      const min = Number(match[1]);
      if (!Number.isNaN(min)) {
        result.experienceYears = min < 2 ? '0-2' : min < 5 ? '2-5' : '5+';
      }
    } else {
      result.experienceYears = years;
    }
    break;
  }

  if (!result.experienceLevel && result.experienceYears) {
    result.experienceLevel =
      result.experienceYears === '0-2' ? 'Junior'
      : result.experienceYears === '2-5' ? 'Mid'
      : 'Senior';
  }

  return result;
}
