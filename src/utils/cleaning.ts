const CITY_ALIASES: Record<string, string> = {
  casa: 'Casablanca',
  casablanca: 'Casablanca',
  'casablanca-settat': 'Casablanca',
  rabat: 'Rabat',
  marrakech: 'Marrakech',
  fes: 'Fès',
  fès: 'Fès',
  tanger: 'Tanger',
  agadir: 'Agadir',
  meknes: 'Meknès',
  meknès: 'Meknès',
  oujda: 'Oujda',
  kenitra: 'Kénitra',
  kénitra: 'Kénitra',
  tetouan: 'Tétouan',
  tétouan: 'Tétouan',
  mohammedia: 'Mohammedia',
  dakhla: 'Dakhla',
  'al hoceima': 'Al Hoceima',
};

const CONTRACT_ALIASES: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  stage: 'Stage',
  internship: 'Stage',
  alternance: 'Alternance',
  freelance: 'Freelance',
  'temps plein': 'Temps plein',
  'temps partiel': 'Temps partiel',
};

const COMPANY_ALIASES: Record<string, string> = {
  'attijariwafa bank': 'Attijariwafa Bank',
  'attijari wafa bank': 'Attijariwafa Bank',
  'attijariwafa': 'Attijariwafa Bank',
  'cih bank': 'CIH Bank',
  'bank of africa': 'Bank of Africa',
  'boa': 'Bank of Africa',
  'bmci': 'BMCI',
  'inwi': 'Inwi',
  'maroc telecom': 'Maroc Telecom',
  'orange maroc': 'Orange Maroc',
  'royal air maroc': 'Royal Air Maroc',
  'ram': 'Royal Air Maroc',
};

export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function cleanText(input: string): string {
  return stripHtml(input)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
}

export function normalizeCity(city: string): string {
  const cleaned = cleanText(city).replace(/\s*\(.*\)\s*/g, '').trim();
  const key = cleaned.toLowerCase();
  return CITY_ALIASES[key] ?? cleaned.split(/[,\-/]/)[0]?.trim() ?? cleaned;
}

export function normalizeContractType(contractType: string | undefined): string | undefined {
  if (!contractType) return undefined;
  const key = cleanText(contractType).toLowerCase();
  return CONTRACT_ALIASES[key] ?? cleanText(contractType);
}

export function normalizeCompanyName(company: string): string {
  const key = cleanText(company).toLowerCase();
  return COMPANY_ALIASES[key] ?? cleanText(company);
}

export function normalizeJobTextFields<T extends {
  title: string;
  company: string;
  city: string;
  country: string;
  description: string;
  requirements?: string;
  contractType?: string;
}>(job: T): T {
  return {
    ...job,
    title: cleanText(job.title),
    company: normalizeCompanyName(job.company),
    city: normalizeCity(job.city),
    country: cleanText(job.country) || 'Morocco',
    description: cleanText(job.description),
    requirements: job.requirements ? cleanText(job.requirements) : job.requirements,
    contractType: normalizeContractType(job.contractType),
  };
}
