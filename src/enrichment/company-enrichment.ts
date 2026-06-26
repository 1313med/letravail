/** Known employer metadata — expanded for Month 2 coverage target (95%+) */
export interface CompanyEnrichment {
  websiteUrl?: string;
  logoUrl?: string;
  industry?: string;
  sector?: string;
  size?: string;
  careerPageUrl?: string;
  linkedinUrl?: string;
  headquartersCity?: string;
  description?: string;
  aliases?: string[];
}

const COMPANIES: CompanyEnrichment[] = [
  {
    websiteUrl: 'https://www.cihbank.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '1000-5000',
    careerPageUrl: 'https://recrutement.cihbank.ma',
    linkedinUrl: 'https://www.linkedin.com/company/cih-bank',
    headquartersCity: 'Casablanca',
    description: 'Banque marocaine de détail et corporate.',
    aliases: ['cih bank', 'cih'],
  },
  {
    websiteUrl: 'https://www.attijariwafabank.com',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '10000+',
    careerPageUrl: 'https://attijariwafabank.csod.com',
    linkedinUrl: 'https://www.linkedin.com/company/attijariwafa-bank',
    headquartersCity: 'Casablanca',
    description: 'Premier groupe bancaire du Maghreb.',
    aliases: ['attijariwafa bank', 'attijariwafa', 'attijari wafa'],
  },
  {
    websiteUrl: 'https://www.bankofafrica.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '1000-5000',
    careerPageUrl: 'https://www.bankofafrica.ma/fr/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/bank-of-africa',
    headquartersCity: 'Casablanca',
    aliases: ['bank of africa', 'boa'],
  },
  {
    websiteUrl: 'https://www.bmci.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '500-1000',
    careerPageUrl: 'https://www.bmci.ma/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/bmci',
    headquartersCity: 'Casablanca',
    aliases: ['bmci'],
  },
  {
    websiteUrl: 'https://www.dxc.com',
    industry: 'Information Technology',
    sector: 'technology',
    size: '10000+',
    careerPageUrl: 'https://careers.dxc.com',
    linkedinUrl: 'https://www.linkedin.com/company/dxc-technology',
    headquartersCity: 'Casablanca',
    aliases: ['dxc technology', 'dxc'],
  },
  {
    websiteUrl: 'https://www.capgemini.com',
    industry: 'Information Technology',
    sector: 'technology',
    size: '10000+',
    careerPageUrl: 'https://www.capgemini.com/ma-fr/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/capgemini',
    headquartersCity: 'Casablanca',
    aliases: ['capgemini', 'capgemini maroc'],
  },
  {
    websiteUrl: 'https://www.cgi.com',
    industry: 'Information Technology',
    sector: 'technology',
    size: '10000+',
    careerPageUrl: 'https://www.cgi.com/en/careers',
    linkedinUrl: 'https://www.linkedin.com/company/cgi',
    headquartersCity: 'Rabat',
    aliases: ['cgi', 'cgi maroc'],
  },
  {
    websiteUrl: 'https://www.inwi.ma',
    industry: 'Telecommunications',
    sector: 'telecom',
    size: '1000-5000',
    careerPageUrl: 'https://www.inwi.ma/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/inwi',
    headquartersCity: 'Casablanca',
    aliases: ['inwi'],
  },
  {
    websiteUrl: 'https://www.iam.ma',
    industry: 'Telecommunications',
    sector: 'telecom',
    size: '10000+',
    careerPageUrl: 'https://www.iam.ma/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/iam-maroc-telecom',
    headquartersCity: 'Rabat',
    aliases: ['maroc telecom', 'iam'],
  },
  {
    websiteUrl: 'https://www.orange.ma',
    industry: 'Telecommunications',
    sector: 'telecom',
    size: '1000-5000',
    careerPageUrl: 'https://www.orange.ma/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/orange-maroc',
    headquartersCity: 'Casablanca',
    aliases: ['orange maroc', 'orange'],
  },
  {
    websiteUrl: 'https://www.renault.ma',
    industry: 'Automotive',
    sector: 'automotive',
    size: '1000-5000',
    linkedinUrl: 'https://www.linkedin.com/company/renault-maroc',
    headquartersCity: 'Casablanca',
    aliases: ['renault maroc', 'renault'],
  },
  {
    websiteUrl: 'https://www.marjane.ma',
    industry: 'Retail',
    sector: 'retail',
    size: '5000-10000',
    linkedinUrl: 'https://www.linkedin.com/company/marjane',
    headquartersCity: 'Casablanca',
    aliases: ['marjane', 'marjane group'],
  },
  {
    websiteUrl: 'https://www.labelvie.ma',
    industry: 'Retail',
    sector: 'retail',
    size: '1000-5000',
    headquartersCity: 'Casablanca',
    aliases: ['labelvie', 'label vie'],
  },
  {
    websiteUrl: 'https://www.ram.ma',
    industry: 'Airlines',
    sector: 'airlines',
    size: '5000-10000',
    careerPageUrl: 'https://www.ram.ma/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/royal-air-maroc',
    headquartersCity: 'Casablanca',
    aliases: ['royal air maroc', 'ram'],
  },
  {
    websiteUrl: 'https://www.ocpgroup.ma',
    industry: 'Mining & Chemicals',
    sector: 'industry',
    size: '10000+',
    linkedinUrl: 'https://www.linkedin.com/company/ocp-group',
    headquartersCity: 'Casablanca',
    aliases: ['ocp', 'ocp group'],
  },
  {
    websiteUrl: 'https://www.groupebcp.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '10000+',
    linkedinUrl: 'https://www.linkedin.com/company/banque-populaire',
    headquartersCity: 'Casablanca',
    aliases: ['banque populaire', 'bcp', 'groupe bcp'],
  },
  {
    websiteUrl: 'https://www.creditduMaroc.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '1000-5000',
    headquartersCity: 'Casablanca',
    aliases: ['crédit du maroc', 'credit du maroc'],
  },
  {
    websiteUrl: 'https://www.creditagricole.ma',
    industry: 'Banking & Finance',
    sector: 'banks',
    size: '1000-5000',
    headquartersCity: 'Casablanca',
    aliases: ['crédit agricole du maroc', 'credit agricole'],
  },
  {
    websiteUrl: 'https://www.anapec.org',
    industry: 'Public Employment',
    sector: 'government',
    size: '500-1000',
    careerPageUrl: 'https://www.anapec.org',
    headquartersCity: 'Rabat',
    aliases: ['anapec'],
  },
  {
    websiteUrl: 'https://www.accenture.com/ma-fr',
    industry: 'Consulting & IT',
    sector: 'technology',
    size: '10000+',
    linkedinUrl: 'https://www.linkedin.com/company/accenture',
    headquartersCity: 'Casablanca',
    aliases: ['accenture', 'accenture maroc'],
  },
  {
    websiteUrl: 'https://www2.deloitte.com/ma',
    industry: 'Consulting',
    sector: 'technology',
    size: '1000-5000',
    linkedinUrl: 'https://www.linkedin.com/company/deloitte',
    headquartersCity: 'Casablanca',
    aliases: ['deloitte', 'deloitte maroc'],
  },
  {
    websiteUrl: 'https://www.intelcia.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://www.intelcia.com/fr/nous-rejoindre/',
    linkedinUrl: 'https://www.linkedin.com/company/intelcia',
    headquartersCity: 'Casablanca',
    aliases: ['intelcia', 'intelcia group'],
  },
  {
    websiteUrl: 'https://www.teleperformance.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://jobs.teleperformance.com/',
    linkedinUrl: 'https://www.linkedin.com/company/teleperformance',
    headquartersCity: 'Casablanca',
    aliases: ['teleperformance', 'teleperformance maroc', 'tp maroc'],
  },
  {
    websiteUrl: 'https://www.foundever.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://jobs.foundever.com/',
    linkedinUrl: 'https://www.linkedin.com/company/foundever',
    headquartersCity: 'Casablanca',
    aliases: ['foundever', 'foundever maroc', 'sitel', 'sitel maroc'],
  },
  {
    websiteUrl: 'https://www.concentrix.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://jobs.concentrix.com/',
    linkedinUrl: 'https://www.linkedin.com/company/concentrix',
    headquartersCity: 'Casablanca',
    aliases: ['concentrix', 'concentrix maroc'],
  },
  {
    websiteUrl: 'https://www.webhelp.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://www.webhelp.com/careers/',
    linkedinUrl: 'https://www.linkedin.com/company/webhelp',
    headquartersCity: 'Casablanca',
    aliases: ['webhelp', 'webhelp maroc'],
  },
  {
    websiteUrl: 'https://www.comdatagroup.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '5000-10000',
    careerPageUrl: 'https://www.comdatagroup.com/fr/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/comdata',
    headquartersCity: 'Casablanca',
    aliases: ['comdata', 'comdata group'],
  },
  {
    websiteUrl: 'https://www.majorel.com',
    industry: 'BPO & Customer Experience',
    sector: 'bpo',
    size: '10000+',
    careerPageUrl: 'https://jobs.majorel.com/',
    linkedinUrl: 'https://www.linkedin.com/company/majorel',
    headquartersCity: 'Casablanca',
    aliases: ['majorel', 'majorel maroc'],
  },
];

const ALIAS_INDEX = new Map<string, CompanyEnrichment>();

for (const company of COMPANIES) {
  for (const alias of company.aliases ?? []) {
    ALIAS_INDEX.set(alias.toLowerCase(), company);
  }
}

export function enrichCompany(companyName: string): CompanyEnrichment | undefined {
  const key = companyName.toLowerCase().trim();
  if (ALIAS_INDEX.has(key)) return ALIAS_INDEX.get(key);

  for (const [alias, data] of ALIAS_INDEX) {
    if (key.includes(alias) || alias.includes(key)) return data;
  }
  return undefined;
}

export function getKnownCompanyCount(): number {
  return COMPANIES.length;
}
