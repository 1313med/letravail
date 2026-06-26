const BENEFIT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Health Insurance', pattern: /\b(mutuelle|assurance\s+maladie|health\s+insurance|couverture\s+médicale)\b/i },
  { label: 'Meal Vouchers', pattern: /\b(tickets?\s+restaurant|meal\s+vouchers?)\b/i },
  { label: 'Transport Allowance', pattern: /\b(indemnité\s+de\s+transport|transport\s+allowance)\b/i },
  { label: 'Performance Bonus', pattern: /\b(prime|bonus|intéressement|participation)\b/i },
  { label: 'Training', pattern: /\b(formation|training|développement\s+professionnel)\b/i },
  { label: 'Remote Work', pattern: /\b(télétravail|remote\s+work|travail\s+à\s+distance)\b/i },
  { label: 'Flexible Hours', pattern: /\b(horaires?\s+flexibles|flexible\s+hours)\b/i },
  { label: 'Company Car', pattern: /\b(véhicule\s+de\s+fonction|company\s+car)\b/i },
  { label: 'Gym', pattern: /\b(salle\s+de\s+sport|gym|fitness)\b/i },
  { label: 'Stock Options', pattern: /\b(stock\s+options?|BSPCE|actions)\b/i },
];

export function extractBenefits(text: string): string[] {
  const found = new Set<string>();
  for (const { label, pattern } of BENEFIT_PATTERNS) {
    if (pattern.test(text)) found.add(label);
  }
  return [...found];
}
