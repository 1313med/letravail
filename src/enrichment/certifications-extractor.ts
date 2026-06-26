const CERTIFICATIONS = [
  { name: 'PMP', patterns: [/\bpmp\b/i, /project management professional/i] },
  { name: 'ITIL', patterns: [/\bitil\b/i] },
  { name: 'AWS Certified', patterns: [/\baws\s+certified\b/i, /\bamazon\s+web\s+services\s+certified\b/i] },
  { name: 'Azure Certified', patterns: [/\bazure\s+certified\b/i, /\bmicrosoft\s+certified\b/i] },
  { name: 'CISSP', patterns: [/\bcissp\b/i] },
  { name: 'CEH', patterns: [/\bceh\b/i, /certified ethical hacker/i] },
  { name: 'Scrum Master', patterns: [/\bscrum\s+master\b/i, /\bpsm\b/i, /\bcsm\b/i] },
  { name: 'Six Sigma', patterns: [/\bsix\s+sigma\b/i, /\blean\s+six\s+sigma\b/i] },
  { name: 'TOEIC', patterns: [/\btoeic\b/i] },
  { name: 'TOEFL', patterns: [/\btoefl\b/i] },
  { name: 'IELTS', patterns: [/\bielts\b/i] },
  { name: 'CPA', patterns: [/\bcpa\b/i] },
  { name: 'CFA', patterns: [/\bcfa\b/i, /chartered financial analyst/i] },
  { name: 'CISA', patterns: [/\bcisa\b/i] },
  { name: 'PRINCE2', patterns: [/\bprince2\b/i] },
];

export function extractCertifications(text: string): Array<{ name: string; confidence: number }> {
  const found: Array<{ name: string; confidence: number }> = [];
  for (const cert of CERTIFICATIONS) {
    if (cert.patterns.some((p) => p.test(text))) {
      found.push({ name: cert.name, confidence: 0.8 });
    }
  }
  return found;
}
