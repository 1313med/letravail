import type { Job, EnrichedJob } from '../types/job.js';
import { cleanText, stripHtml } from '../utils/cleaning.js';
import { enrichCompany } from './company-enrichment.js';
import { extractContractType } from './contract-extractor.js';
import { extractEducationLevel } from './education-extractor.js';
import { extractExperience } from './experience-extractor.js';
import { isRemoteLocation, normalizeLocation } from './location-normalizer.js';
import { scoreJobQuality } from './quality-scorer.js';
import { extractSalary } from './salary-extractor.js';
import { extractSkills } from './skill-extractor.js';

export interface EnrichmentResult {
  job: EnrichedJob;
  skills: Array<{ name: string; slug: string; category?: string; confidence: number }>;
  companyEnrichment?: ReturnType<typeof enrichCompany>;
  locationMeta: ReturnType<typeof normalizeLocation>;
}

export function enrichJob(raw: Job): EnrichmentResult {
  const fullText = [raw.title, raw.description, raw.requirements].filter(Boolean).join('\n\n');
  const cleanedDescription = cleanText(raw.description);
  const rawHtml = raw.rawHtml;

  const skills = extractSkills(fullText);
  const experience = extractExperience(fullText, raw.title);
  const contractType = extractContractType(fullText, raw.contractType);
  const educationLevel = extractEducationLevel(fullText);
  const salaryData = raw.salary
    ? { salary: raw.salary }
    : extractSalary(fullText);
  const locationMeta = normalizeLocation(raw.city, raw.country);
  const companyEnrichment = enrichCompany(raw.company);
  const remote = raw.remote ?? isRemoteLocation(fullText);

  const hasCompanyEnrichment = !!companyEnrichment && Object.values(companyEnrichment).some(Boolean);

  const quality = scoreJobQuality({
    description: cleanedDescription,
    title: raw.title,
    skillCount: skills.length,
    hasExperience: !!(experience.experienceLevel || experience.experienceYears),
    hasLocation: !!(locationMeta.region || locationMeta.canonicalCity),
    hasSalary: !!(salaryData.salary || raw.salary),
    hasContract: !!contractType,
    hasEducation: !!educationLevel,
    hasCompanyEnrichment,
  });

  const extractionMetadata = {
    enrichedAt: new Date().toISOString(),
    source: raw.source,
    descriptionLength: cleanedDescription.length,
    rawHtmlSize: rawHtml?.length ?? 0,
    skillsFound: skills.length,
    dimensions: quality,
  };

  const job: EnrichedJob = {
    ...raw,
    description: cleanedDescription,
    city: locationMeta.city,
    country: locationMeta.country,
    contractType,
    remote,
    experienceLevel: experience.experienceLevel,
    experienceYears: experience.experienceYears,
    educationLevel,
    salary: salaryData.salary ?? raw.salary,
    salaryMin: 'salaryMin' in salaryData ? salaryData.salaryMin : undefined,
    salaryMax: 'salaryMax' in salaryData ? salaryData.salaryMax : undefined,
    salaryCurrency: 'salaryCurrency' in salaryData ? salaryData.salaryCurrency : undefined,
    salaryPeriod: 'salaryPeriod' in salaryData ? salaryData.salaryPeriod : undefined,
    salaryNet: 'salaryNet' in salaryData ? salaryData.salaryNet : undefined,
    rawHtml: rawHtml ?? (raw.description !== raw.title ? undefined : rawHtml),
    extractionMetadata,
    qualityScore: quality.overallScore,
    descriptionScore: quality.descriptionScore,
    region: locationMeta.region,
    canonicalCity: locationMeta.canonicalCity,
  };

  return {
    job,
    skills: skills.map((s) => ({
      name: s.name,
      slug: s.slug,
      category: s.category,
      confidence: s.confidence,
    })),
    companyEnrichment,
    locationMeta,
  };
}

export function enrichJobs(jobs: Job[]): EnrichmentResult[] {
  return jobs.map(enrichJob);
}

/** Merge detail page content into a job before enrichment */
export function mergeDetailContent(
  job: Job,
  detail: { description?: string; requirements?: string; rawHtml?: string; contractType?: string; city?: string },
): Job {
  const description = detail.description && detail.description.length > (job.description?.length ?? 0)
    ? cleanText(detail.description)
    : job.description;

  return {
    ...job,
    description,
    requirements: detail.requirements ?? job.requirements,
    rawHtml: detail.rawHtml ?? job.rawHtml,
    contractType: detail.contractType ?? job.contractType,
    city: detail.city ?? job.city,
  };
}

export function htmlToDescription(html: string): string {
  return cleanText(stripHtml(html));
}
