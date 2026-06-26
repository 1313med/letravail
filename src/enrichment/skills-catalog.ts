/**
 * Canonical skills catalog with multilingual aliases.
 * Every alias normalizes to one canonical skill slug.
 */
export type SkillCategory =
  | 'language'
  | 'framework'
  | 'database'
  | 'cloud'
  | 'tool'
  | 'methodology'
  | 'erp'
  | 'business'
  | 'finance'
  | 'marketing'
  | 'soft-skill'
  | 'security'
  | 'other';

export interface CanonicalSkill {
  name: string;
  slug: string;
  category: SkillCategory;
  aliases: string[];
}

/** Build word-boundary regex for an alias (handles dots, spaces, accents) */
export function aliasToPattern(alias: string): RegExp {
  const escaped = alias
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
}

export const CANONICAL_SKILLS: CanonicalSkill[] = [
  // ── Languages ──
  { name: 'JavaScript', slug: 'javascript', category: 'language', aliases: ['javascript', 'js', 'ecmascript', 'ecma script'] },
  { name: 'TypeScript', slug: 'typescript', category: 'language', aliases: ['typescript', 'ts'] },
  { name: 'Python', slug: 'python', category: 'language', aliases: ['python'] },
  { name: 'Java', slug: 'java', category: 'language', aliases: ['java'] },
  { name: 'C#', slug: 'csharp', category: 'language', aliases: ['c#', 'c sharp', 'csharp'] },
  { name: 'PHP', slug: 'php', category: 'language', aliases: ['php'] },
  { name: 'Node.js', slug: 'nodejs', category: 'language', aliases: ['node.js', 'nodejs', 'node js', 'node'] },
  { name: 'C', slug: 'c-lang', category: 'language', aliases: ['langage c', 'programmation c'] },
  { name: 'C++', slug: 'cpp', category: 'language', aliases: ['c++', 'cpp'] },
  { name: 'Go', slug: 'go', category: 'language', aliases: ['golang', 'go lang'] },
  { name: 'Rust', slug: 'rust', category: 'language', aliases: ['rust'] },
  { name: 'Kotlin', slug: 'kotlin', category: 'language', aliases: ['kotlin'] },
  { name: 'Swift', slug: 'swift', category: 'language', aliases: ['swift'] },
  { name: 'R', slug: 'r-lang', category: 'language', aliases: ['langage r', 'programmation r'] },
  { name: 'Scala', slug: 'scala', category: 'language', aliases: ['scala'] },
  { name: 'ABAP', slug: 'abap', category: 'language', aliases: ['abap'] },

  // ── Frameworks ──
  { name: 'React', slug: 'react', category: 'framework', aliases: ['react', 'reactjs', 'react.js', 'react native', 'reactnative'] },
  { name: 'Angular', slug: 'angular', category: 'framework', aliases: ['angular', 'angularjs', 'angular.js'] },
  { name: 'Vue.js', slug: 'vue', category: 'framework', aliases: ['vue', 'vuejs', 'vue.js'] },
  { name: 'Next.js', slug: 'nextjs', category: 'framework', aliases: ['next.js', 'nextjs', 'next js'] },
  { name: 'Laravel', slug: 'laravel', category: 'framework', aliases: ['laravel'] },
  { name: 'Symfony', slug: 'symfony', category: 'framework', aliases: ['symfony'] },
  { name: 'Spring', slug: 'spring', category: 'framework', aliases: ['spring boot', 'spring', 'springboot'] },
  { name: 'Django', slug: 'django', category: 'framework', aliases: ['django'] },
  { name: 'Flask', slug: 'flask', category: 'framework', aliases: ['flask'] },
  { name: 'FastAPI', slug: 'fastapi', category: 'framework', aliases: ['fastapi', 'fast api'] },
  { name: '.NET', slug: 'dotnet', category: 'framework', aliases: ['.net', 'dotnet', 'asp.net', 'aspnet'] },
  { name: 'Express.js', slug: 'express', category: 'framework', aliases: ['express.js', 'expressjs', 'express'] },

  // ── Databases ──
  { name: 'SQL', slug: 'sql', category: 'database', aliases: ['sql', 't-sql', 'tsql', 'pl/sql', 'plsql'] },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'database', aliases: ['postgresql', 'postgres', 'postgre sql'] },
  { name: 'MySQL', slug: 'mysql', category: 'database', aliases: ['mysql', 'my sql'] },
  { name: 'Oracle', slug: 'oracle-db', category: 'database', aliases: ['oracle database', 'oracle db', 'oracle'] },
  { name: 'SQL Server', slug: 'sql-server', category: 'database', aliases: ['sql server', 'mssql', 'microsoft sql server'] },
  { name: 'MongoDB', slug: 'mongodb', category: 'database', aliases: ['mongodb', 'mongo db', 'mongo'] },
  { name: 'Redis', slug: 'redis', category: 'database', aliases: ['redis'] },
  { name: 'Elasticsearch', slug: 'elasticsearch', category: 'database', aliases: ['elasticsearch', 'elastic search'] },
  { name: 'DB2', slug: 'db2', category: 'database', aliases: ['db2', 'ibm db2'] },

  // ── Cloud & DevOps ──
  { name: 'AWS', slug: 'aws', category: 'cloud', aliases: ['aws', 'amazon web services', 'amazon aws'] },
  { name: 'Azure', slug: 'azure', category: 'cloud', aliases: ['azure', 'microsoft azure', 'ms azure'] },
  { name: 'Google Cloud', slug: 'gcp', category: 'cloud', aliases: ['google cloud', 'gcp', 'google cloud platform'] },
  { name: 'Docker', slug: 'docker', category: 'tool', aliases: ['docker'] },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'tool', aliases: ['kubernetes', 'k8s', 'k8 s'] },
  { name: 'Terraform', slug: 'terraform', category: 'tool', aliases: ['terraform'] },
  { name: 'Ansible', slug: 'ansible', category: 'tool', aliases: ['ansible'] },
  { name: 'Jenkins', slug: 'jenkins', category: 'tool', aliases: ['jenkins'] },
  { name: 'Git', slug: 'git', category: 'tool', aliases: ['git', 'github', 'gitlab', 'bitbucket'] },
  { name: 'Linux', slug: 'linux', category: 'tool', aliases: ['linux', 'unix', 'ubuntu', 'centos', 'red hat', 'redhat'] },
  { name: 'Windows Server', slug: 'windows-server', category: 'tool', aliases: ['windows server', 'serveur windows'] },

  // ── Data & BI ──
  { name: 'Power BI', slug: 'power-bi', category: 'tool', aliases: ['power bi', 'powerbi', 'microsoft power bi'] },
  { name: 'Tableau', slug: 'tableau', category: 'tool', aliases: ['tableau'] },
  { name: 'Excel', slug: 'excel', category: 'tool', aliases: ['excel', 'ms excel', 'microsoft excel'] },
  { name: 'Microsoft Office', slug: 'microsoft-office', category: 'tool', aliases: ['microsoft office', 'ms office', 'suite office', 'pack office'] },
  { name: 'Word', slug: 'word', category: 'tool', aliases: ['microsoft word', 'ms word', 'word'] },
  { name: 'PowerPoint', slug: 'powerpoint', category: 'tool', aliases: ['powerpoint', 'power point'] },
  { name: 'ETL', slug: 'etl', category: 'methodology', aliases: ['etl', 'extract transform load'] },
  { name: 'Data Analysis', slug: 'data-analysis', category: 'business', aliases: ['data analysis', 'analyse de données', 'analyse des données', 'data analyst', 'analyste de données'] },
  { name: 'Machine Learning', slug: 'machine-learning', category: 'methodology', aliases: ['machine learning', 'apprentissage automatique', 'ml', 'deep learning', 'intelligence artificielle', ' ia ', 'ai '] },
  { name: 'Spark', slug: 'spark', category: 'tool', aliases: ['apache spark', 'spark', 'pyspark'] },
  { name: 'Hadoop', slug: 'hadoop', category: 'tool', aliases: ['hadoop'] },

  // ── ERP & CRM ──
  { name: 'SAP', slug: 'sap', category: 'erp', aliases: ['sap', 'sap erp', 'sap hana', 'sap fiori', 'sap bw'] },
  { name: 'ERP', slug: 'erp', category: 'erp', aliases: ['erp', 'progiciel de gestion intégré', 'pgi'] },
  { name: 'CRM', slug: 'crm', category: 'erp', aliases: ['crm', 'salesforce', 'dynamics 365', 'dynamics crm', 'hubspot'] },
  { name: 'Oracle EBS', slug: 'oracle-ebs', category: 'erp', aliases: ['oracle ebs', 'oracle e-business'] },

  // ── Methodologies ──
  { name: 'Agile', slug: 'agile', category: 'methodology', aliases: ['agile', 'scrum', 'kanban', 'safe', 'méthode agile', 'methode agile'] },
  { name: 'DevOps', slug: 'devops', category: 'methodology', aliases: ['devops', 'dev ops', 'ci/cd', 'ci cd', 'cicd'] },
  { name: 'ITIL', slug: 'itil', category: 'methodology', aliases: ['itil'] },
  { name: 'Microservices', slug: 'microservices', category: 'methodology', aliases: ['microservices', 'micro services', 'micro-services'] },
  { name: 'REST API', slug: 'rest-api', category: 'other', aliases: ['rest api', 'restful', 'api rest', 'webservices', 'web services'] },
  { name: 'Project Management', slug: 'project-management', category: 'business', aliases: ['gestion de projet', 'gestion des projets', 'chef de projet', 'cheffe de projet', 'project management', 'pmp', 'prince2'] },

  // ── Security ──
  { name: 'Cybersecurity', slug: 'cybersecurity', category: 'security', aliases: ['cyber sécurité', 'cybersecurite', 'cybersecurity', 'cyber security', 'sécurité informatique', 'securite informatique', 'soc', 'siem', 'iso 27001', 'pentest'] },
  { name: 'Network Security', slug: 'network-security', category: 'security', aliases: ['sécurité réseau', 'securite reseau', 'firewall', 'pare-feu'] },

  // ── Banking & Finance (FR) ──
  { name: 'Banking', slug: 'banking', category: 'finance', aliases: ['banque', 'banking', 'secteur bancaire', 'activité bancaire', 'services bancaires'] },
  { name: 'Credit Analysis', slug: 'credit-analysis', category: 'finance', aliases: ['analyse de crédit', 'analyse credit', 'credit analysis', 'risque crédit', 'risque credit'] },
  { name: 'Risk Management', slug: 'risk-management', category: 'finance', aliases: ['gestion des risques', 'gestion de risque', 'risk management', 'risque opérationnel', 'risque operationnel'] },
  { name: 'Compliance', slug: 'compliance', category: 'finance', aliases: ['conformité', 'conformite', 'compliance', 'kyc', 'aml', 'lab-ft', 'lutte anti blanchiment'] },
  { name: 'Accounting', slug: 'accounting', category: 'finance', aliases: ['comptabilité', 'comptabilite', 'accounting', 'comptable', 'finance comptabilité'] },
  { name: 'Audit', slug: 'audit', category: 'finance', aliases: ['audit', 'auditeur', 'auditrice', 'audit interne', 'audit externe'] },
  { name: 'Treasury', slug: 'treasury', category: 'finance', aliases: ['trésorerie', 'tresorerie', 'treasury', 'cash management'] },
  { name: 'Trade Finance', slug: 'trade-finance', category: 'finance', aliases: ['trade finance', 'financement du commerce', 'crédit documentaire', 'credit documentaire'] },
  { name: 'Investment Banking', slug: 'investment-banking', category: 'finance', aliases: ['banque dinvestissement', "banque d'investissement", 'investment banking', 'm&a', 'fusions acquisitions'] },

  // ── Business & Sales (FR) ──
  { name: 'Sales', slug: 'sales', category: 'business', aliases: ['commercial', 'commerciale', 'vente', 'sales', 'business development', 'développement commercial', 'developpement commercial'] },
  { name: 'Customer Service', slug: 'customer-service', category: 'business', aliases: ['service client', 'relation client', 'customer service', 'support client', 'conseiller clientèle', 'conseillère clientèle', 'gestionnaire clientèle'] },
  { name: 'Marketing', slug: 'marketing', category: 'marketing', aliases: ['marketing', 'marketing digital', 'digital marketing', 'communication', 'community management', 'seo', 'sem', 'réseaux sociaux'] },
  { name: 'Business Analysis', slug: 'business-analysis', category: 'business', aliases: ['business analyst', 'business analysis', 'analyste métier', 'analyste metier', 'maîtrise douvrage', 'maitrise douvrage', 'amo'] },
  { name: 'Web Development', slug: 'web-development', category: 'framework', aliases: ['développement web', 'developpement web', 'web development', 'développeur web', 'developpeur web'] },
  { name: 'Mobile Development', slug: 'mobile-development', category: 'framework', aliases: ['développement mobile', 'developpement mobile', 'mobile development', 'android', 'ios', 'flutter', 'react native'] },

  // ── DBA & Infrastructure ──
  { name: 'Database Administration', slug: 'dba', category: 'database', aliases: ['dba', 'administrateur base de données', 'administrateur bases de données', 'database administrator', 'expert dba', 'administrateur oracle', 'administrateur sql'] },
  { name: 'System Administration', slug: 'sysadmin', category: 'tool', aliases: ['administrateur système', 'administrateur systeme', 'system administrator', 'sysadmin', 'ingénieur système', 'ingenieur systeme'] },
  { name: 'Network Administration', slug: 'network-admin', category: 'tool', aliases: ['administrateur réseau', 'administrateur reseau', 'network administrator', 'ingénieur réseau', 'ingenieur reseau'] },

  // ── Soft skills ──
  { name: 'Leadership', slug: 'leadership', category: 'soft-skill', aliases: ['leadership', 'management', 'encadrement', 'gestion déquipe', 'gestion equipe'] },
  { name: 'Negotiation', slug: 'negotiation', category: 'soft-skill', aliases: ['négociation', 'negociation', 'negotiation'] },

  // ── BPO / Call Center (FR/EN) ──
  { name: 'Call Center', slug: 'call-center', category: 'business', aliases: ['call center', 'centre dappels', "centre d'appels", 'centre de contact', 'contact center'] },
  { name: 'Customer Support', slug: 'customer-support', category: 'business', aliases: ['support client', 'customer support', 'technical support', 'help desk', 'helpdesk', 'assistance technique'] },
  { name: 'Teleconseiller', slug: 'teleconseiller', category: 'business', aliases: ['téléconseiller', 'teleconseiller', 'conseiller clientèle', 'conseillère clientèle', 'customer advisor', 'customer service representative', 'chargé de clientèle'] },
  { name: 'Sales Advisor', slug: 'sales-advisor', category: 'business', aliases: ['sales advisor', 'conseiller commercial', 'conseiller vente', 'chargé de vente', 'télévente', 'televente'] },
  { name: 'Quality Assurance', slug: 'quality-assurance', category: 'business', aliases: ['quality analyst', 'assurance qualité', 'assurance qualite', 'contrôle qualité', 'controle qualite', 'qa analyst'] },
  { name: 'Team Leadership', slug: 'team-leadership', category: 'soft-skill', aliases: ['team leader', 'supervisor', 'superviseur', 'chef déquipe', 'chef equipe', 'encadrement'] },
  { name: 'Workforce Management', slug: 'wfm', category: 'business', aliases: ['workforce management', 'wfm', 'planification', 'planning'] },
  { name: 'Back Office', slug: 'back-office', category: 'business', aliases: ['back office', 'back-office', 'backoffice'] },
  { name: 'CRM Tools', slug: 'crm-tools', category: 'tool', aliases: ['zendesk', 'salesforce service cloud', 'genesys', 'avaya', 'nice incontact', 'freshdesk', 'servicenow'] },
  { name: 'Typing Speed', slug: 'typing', category: 'other', aliases: ['frappe', 'saisie', 'typing', 'dactylographie'] },
];

export interface ExtractedSkill {
  name: string;
  slug: string;
  category: SkillCategory;
  confidence: number;
  matchedAlias: string;
}
