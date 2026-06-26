const DEPARTMENT_PATTERNS: Array<{ dept: string; patterns: RegExp[] }> = [
  { dept: 'IT', patterns: [/\b(informatique|it\b|technology|développement|engineering)\b/i] },
  { dept: 'Customer Service', patterns: [/\b(service\s+client|customer\s+service|relation\s+client|call\s+center|centre\s+d'appels?)\b/i] },
  { dept: 'Sales', patterns: [/\b(commercial|sales|business\s+development|vente)\b/i] },
  { dept: 'Finance', patterns: [/\b(finance|comptabilité|accounting|trésorerie)\b/i] },
  { dept: 'HR', patterns: [/\b(ressources\s+humaines|rh\b|human\s+resources|recrutement)\b/i] },
  { dept: 'Marketing', patterns: [/\b(marketing|communication|digital\s+marketing)\b/i] },
  { dept: 'Operations', patterns: [/\b(opérations|operations|logistique|supply\s+chain)\b/i] },
  { dept: 'Quality', patterns: [/\b(qualité|quality|qa\b|qc\b)\b/i] },
  { dept: 'Legal', patterns: [/\b(juridique|legal|compliance|conformité)\b/i] },
  { dept: 'Risk', patterns: [/\b(risque|risk|audit)\b/i] },
];

export function extractDepartment(title: string, text: string): string | undefined {
  const combined = `${title}\n${text}`;
  for (const { dept, patterns } of DEPARTMENT_PATTERNS) {
    if (patterns.some((p) => p.test(combined))) return dept;
  }
  return undefined;
}
