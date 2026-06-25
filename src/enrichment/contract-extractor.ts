import { normalizeContractType } from '../utils/cleaning.js';

const CONTRACT_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\bCDI\b/i, type: 'CDI' },
  { pattern: /\bCDD\b/i, type: 'CDD' },
  { pattern: /\bstage\b/i, type: 'Stage' },
  { pattern: /\bstagiaire\b/i, type: 'Stage' },
  { pattern: /\binternship\b/i, type: 'Stage' },
  { pattern: /\bfreelance\b/i, type: 'Freelance' },
  { pattern: /\bindépendant\b/i, type: 'Freelance' },
  { pattern: /\balternance\b/i, type: 'Alternance' },
  { pattern: /\bapprentissage\b/i, type: 'Alternance' },
  { pattern: /\btemps\s+plein\b/i, type: 'Temps plein' },
  { pattern: /\bfull[\s-]?time\b/i, type: 'Temps plein' },
  { pattern: /\btemps\s+partiel\b/i, type: 'Temps partiel' },
  { pattern: /\bpart[\s-]?time\b/i, type: 'Temps partiel' },
  { pattern: /\bintérim\b/i, type: 'CDD' },
  { pattern: /\banapec\b/i, type: 'CDD' },
];

export function extractContractType(text: string, existing?: string): string | undefined {
  if (existing) return normalizeContractType(existing);

  for (const { pattern, type } of CONTRACT_PATTERNS) {
    if (pattern.test(text)) return type;
  }

  return undefined;
}
