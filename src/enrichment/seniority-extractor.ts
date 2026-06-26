/**
 * Seniority, management level, visa, relocation extraction.
 */
const SENIORITY_PATTERNS: Array<{ level: string; patterns: RegExp[] }> = [
  { level: 'Intern', patterns: [/\bstage\b/i, /\bstagiaire\b/i, /\binternship\b/i, /\bintern\b/i] },
  { level: 'Junior', patterns: [/\bjunior\b/i, /\bdébutant\b/i, /\bdebutant\b/i, /\b0\s*[-–]\s*2\s*ans\b/i] },
  { level: 'Mid', patterns: [/\bconfirmé\b/i, /\bconfirme\b/i, /\bintermédiaire\b/i, /\b2\s*[-–]\s*5\s*ans\b/i] },
  { level: 'Senior', patterns: [/\bsenior\b/i, /\bsénior\b/i, /\bexpérimenté\b/i, /\b5\s*\+?\s*ans\b/i] },
  { level: 'Lead', patterns: [/\blead\b/i, /\bteam lead\b/i, /\btech lead\b/i, /\bresponsable\b/i] },
  { level: 'Manager', patterns: [/\bmanager\b/i, /\bchef de (?:projet|service|département)\b/i, /\bhead of\b/i] },
  { level: 'Director', patterns: [/\bdirector\b/i, /\bdirecteur\b/i, /\bdirectrice\b/i] },
  { level: 'Executive', patterns: [/\bceo\b/i, /\bpdg\b/i, /\bchief\b/i, /\bvice[\s-]?president\b/i, /\bvp\b/i] },
];

export function extractSeniority(text: string, title = ''): string | undefined {
  const combined = `${title}\n${text}`;
  for (const { level, patterns } of SENIORITY_PATTERNS) {
    if (patterns.some((p) => p.test(combined))) return level;
  }
  return undefined;
}

export function extractManagementLevel(text: string, title = ''): string | undefined {
  const combined = `${title}\n${text}`;
  if (/\bencadrement\b|\bmanagement\b|\bsuperviseur\b|\bsupervisor\b/i.test(combined)) return 'Supervisor';
  if (/\bchef d'équipe\b|\bteam leader\b|\bteam lead\b/i.test(combined)) return 'Team Lead';
  if (/\bmanager\b|\bresponsable\b/i.test(combined)) return 'Manager';
  if (/\bdirecteur\b|\bdirector\b/i.test(combined)) return 'Director';
  return undefined;
}

export function extractVisaSponsorship(text: string): boolean {
  return /\bvisa\s+sponsor|sponsorship|sponsor.*visa|permis de travail\b/i.test(text);
}

export function extractRelocation(text: string): boolean {
  return /\brelocate|relocation|mobilité internationale|mutation\b/i.test(text);
}

export function extractRemoteEligibility(text: string): boolean {
  return /\b(télétravail|remote|à distance|work from home|wfh)\s*(possible|eligible|autorisé|available)?\b/i.test(text);
}

export function extractBusinessFunction(text: string, title = ''): string | undefined {
  const combined = `${title}\n${text}`;
  const functions = [
    { fn: 'Operations', p: /\bopérations|operations|production\b/i },
    { fn: 'Finance', p: /\bfinance|comptabilité|accounting|treasury\b/i },
    { fn: 'Technology', p: /\bit\b|informatique|technology|engineering|développement\b/i },
    { fn: 'Sales', p: /\bcommercial|sales|business development|vente\b/i },
    { fn: 'Customer Service', p: /\bservice client|customer service|relation client\b/i },
    { fn: 'HR', p: /\brh\b|ressources humaines|human resources|recrutement\b/i },
    { fn: 'Legal', p: /\bjuridique|legal|compliance\b/i },
    { fn: 'Marketing', p: /\bmarketing|communication|brand\b/i },
  ];
  for (const { fn, p } of functions) {
    if (p.test(combined)) return fn;
  }
  return undefined;
}
