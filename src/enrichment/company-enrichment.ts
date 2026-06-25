/** Known employer metadata for company enrichment during ingestion */
export interface CompanyEnrichment {
  websiteUrl?: string;
  logoUrl?: string;
  industry?: string;
  size?: string;
  careerPageUrl?: string;
  linkedinUrl?: string;
}

const KNOWN_COMPANIES: Record<string, CompanyEnrichment> = {
  'CIH Bank': {
    websiteUrl: 'https://www.cihbank.ma',
    industry: 'Banking & Finance',
    size: '1000-5000',
    careerPageUrl: 'https://recrutement.cihbank.ma',
    linkedinUrl: 'https://www.linkedin.com/company/cih-bank',
  },
  'Attijariwafa Bank': {
    websiteUrl: 'https://www.attijariwafabank.com',
    industry: 'Banking & Finance',
    size: '10000+',
    careerPageUrl: 'https://attijariwafabank.csod.com',
    linkedinUrl: 'https://www.linkedin.com/company/attijariwafa-bank',
  },
  'Bank of Africa': {
    websiteUrl: 'https://www.bankofafrica.ma',
    industry: 'Banking & Finance',
    size: '1000-5000',
    careerPageUrl: 'https://www.bankofafrica.ma/fr/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/bank-of-africa',
  },
  'BMCI': {
    websiteUrl: 'https://www.bmci.ma',
    industry: 'Banking & Finance',
    size: '500-1000',
    careerPageUrl: 'https://group.bnpparibas/emploi-carriere',
    linkedinUrl: 'https://www.linkedin.com/company/bmci',
  },
  'DXC Technology': {
    websiteUrl: 'https://www.dxc.com',
    industry: 'Information Technology',
    size: '10000+',
    careerPageUrl: 'https://careers.dxc.com',
    linkedinUrl: 'https://www.linkedin.com/company/dxc-technology',
  },
  'Capgemini': {
    websiteUrl: 'https://www.capgemini.com',
    industry: 'Information Technology',
    size: '10000+',
    careerPageUrl: 'https://www.capgemini.com/ma-fr/carrieres',
    linkedinUrl: 'https://www.linkedin.com/company/capgemini',
  },
  'CGI': {
    websiteUrl: 'https://www.cgi.com',
    industry: 'Information Technology',
    size: '10000+',
    careerPageUrl: 'https://www.cgi.com/en/careers',
    linkedinUrl: 'https://www.linkedin.com/company/cgi',
  },
};

export function enrichCompany(companyName: string): CompanyEnrichment | undefined {
  return KNOWN_COMPANIES[companyName];
}
