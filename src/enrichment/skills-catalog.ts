export interface SkillDefinition {
  name: string;
  slug: string;
  category: 'language' | 'framework' | 'database' | 'cloud' | 'tool' | 'methodology' | 'erp' | 'other';
  patterns: RegExp[];
}

export const SKILLS_CATALOG: SkillDefinition[] = [
  { name: 'React', slug: 'react', category: 'framework', patterns: [/\breact(?:\.js|js)?\b/i, /\breact\s*native\b/i] },
  { name: 'Angular', slug: 'angular', category: 'framework', patterns: [/\bangular(?:js)?\b/i] },
  { name: 'Vue', slug: 'vue', category: 'framework', patterns: [/\bvue(?:\.js|js)?\b/i] },
  { name: 'Node.js', slug: 'nodejs', category: 'language', patterns: [/\bnode(?:\.js|js)?\b/i] },
  { name: 'Python', slug: 'python', category: 'language', patterns: [/\bpython\b/i] },
  { name: 'Java', slug: 'java', category: 'language', patterns: [/\bjava\b(?!script)/i] },
  { name: 'JavaScript', slug: 'javascript', category: 'language', patterns: [/\bjavascript\b/i, /\bjs\b/i, /\btypescript\b/i, /\bts\b/i] },
  { name: 'TypeScript', slug: 'typescript', category: 'language', patterns: [/\btypescript\b/i] },
  { name: 'C#', slug: 'csharp', category: 'language', patterns: [/\bc#\b/i, /\bc\s*sharp\b/i, /\.net\b/i, /\bdotnet\b/i] },
  { name: 'PHP', slug: 'php', category: 'language', patterns: [/\bphp\b/i] },
  { name: 'Laravel', slug: 'laravel', category: 'framework', patterns: [/\blaravel\b/i] },
  { name: 'Symfony', slug: 'symfony', category: 'framework', patterns: [/\bsymfony\b/i] },
  { name: 'SQL', slug: 'sql', category: 'database', patterns: [/\bsql\b/i, /\bmysql\b/i, /\bpostgresql\b/i, /\bpostgres\b/i, /\boracle\b/i] },
  { name: 'Power BI', slug: 'power-bi', category: 'tool', patterns: [/\bpower\s*bi\b/i] },
  { name: 'Excel', slug: 'excel', category: 'tool', patterns: [/\bexcel\b/i, /\bms\s*excel\b/i] },
  { name: 'AWS', slug: 'aws', category: 'cloud', patterns: [/\baws\b/i, /\bamazon\s*web\s*services\b/i] },
  { name: 'Azure', slug: 'azure', category: 'cloud', patterns: [/\bazure\b/i, /\bmicrosoft\s*azure\b/i] },
  { name: 'Docker', slug: 'docker', category: 'tool', patterns: [/\bdocker\b/i] },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'tool', patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { name: 'SAP', slug: 'sap', category: 'erp', patterns: [/\bsap\b/i] },
  { name: 'Spring', slug: 'spring', category: 'framework', patterns: [/\bspring\s*boot\b/i, /\bspring\b/i] },
  { name: 'MongoDB', slug: 'mongodb', category: 'database', patterns: [/\bmongodb\b/i, /\bmongo\s*db\b/i] },
  { name: 'Git', slug: 'git', category: 'tool', patterns: [/\bgit\b/i, /\bgithub\b/i, /\bgitlab\b/i] },
  { name: 'Agile', slug: 'agile', category: 'methodology', patterns: [/\bagile\b/i, /\bscrum\b/i] },
  { name: 'DevOps', slug: 'devops', category: 'methodology', patterns: [/\bdevops\b/i, /\bci\/cd\b/i] },
  { name: 'Linux', slug: 'linux', category: 'tool', patterns: [/\blinux\b/i, /\bunix\b/i] },
  { name: 'REST API', slug: 'rest-api', category: 'other', patterns: [/\brest(?:ful)?\s*api\b/i, /\bapi\s*rest\b/i] },
  { name: 'Microservices', slug: 'microservices', category: 'methodology', patterns: [/\bmicro[\s-]?services?\b/i] },
];

export interface ExtractedSkill {
  name: string;
  slug: string;
  category: SkillDefinition['category'];
  confidence: number;
}
