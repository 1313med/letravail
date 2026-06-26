/**
 * Unified entity extraction — skills, languages, certifications, benefits, departments, work model.
 */
import { extractSkills } from './skill-extractor.js';
import type { ExtractedSkill } from './skills-catalog.js';
import { extractExperience } from './experience-extractor.js';
import { extractEducationLevel } from './education-extractor.js';
import { extractContractType } from './contract-extractor.js';
import { extractLanguages } from './languages-extractor.js';
import { extractCertifications } from './certifications-extractor.js';
import { extractBenefits } from './benefits-extractor.js';
import { extractDepartment } from './department-extractor.js';
import { extractWorkModel } from './work-model-extractor.js';
import {
  extractSeniority,
  extractManagementLevel,
  extractVisaSponsorship,
  extractRelocation,
  extractRemoteEligibility,
  extractBusinessFunction,
} from './seniority-extractor.js';
import { parseJobSections } from './section-parser.js';

export interface ExtractedEntities {
  skills: ExtractedSkill[];
  languages: Array<{ name: string; level?: string; confidence: number }>;
  certifications: Array<{ name: string; confidence: number }>;
  benefits: string[];
  department?: string;
  workModel?: 'remote' | 'hybrid' | 'on-site';
  experienceLevel?: string;
  experienceYears?: string;
  educationLevel?: string;
  contractType?: string;
  requiresDrivingLicence?: boolean;
  requiresTravel?: boolean;
  seniority?: string;
  managementLevel?: string;
  visaSponsorship?: boolean;
  relocation?: boolean;
  remoteEligible?: boolean;
  businessFunction?: string;
  sections: ReturnType<typeof parseJobSections>;
  coverage: EntityCoverage;
}

export interface EntityCoverage {
  skills: boolean;
  languages: boolean;
  certifications: boolean;
  benefits: boolean;
  experience: boolean;
  education: boolean;
  contract: boolean;
  department: boolean;
  workModel: boolean;
  seniority: boolean;
  score: number;
}

export function extractAllEntities(text: string, title = ''): ExtractedEntities {
  const sections = parseJobSections(text);
  const searchText = [title, sections.body, sections.requirements, sections.responsibilities, sections.benefits]
    .filter(Boolean)
    .join('\n\n');

  const skills = extractSkills(searchText);
  const languages = extractLanguages(searchText);
  const certifications = extractCertifications(searchText);
  const benefits = extractBenefits(sections.benefits ?? searchText);
  const department = extractDepartment(title, searchText);
  const workModel = extractWorkModel(searchText);
  const experience = extractExperience(searchText, title);
  const educationLevel = extractEducationLevel(searchText);
  const contractType = extractContractType(searchText);

  const requiresDrivingLicence = /\bpermis\s+[ab]|driving\s+licen[cs]e|driver'?s?\s+licen[cs]e\b/i.test(searchText);
  const requiresTravel = /\bdéplacements?|travel\s+required|mobilité géographique\b/i.test(searchText);
  const seniority = extractSeniority(searchText, title);
  const managementLevel = extractManagementLevel(searchText, title);
  const visaSponsorship = extractVisaSponsorship(searchText);
  const relocation = extractRelocation(searchText);
  const remoteEligible = extractRemoteEligibility(searchText);
  const businessFunction = extractBusinessFunction(searchText, title);

  const coverage = computeCoverage({
    skills: skills.length > 0,
    languages: languages.length > 0,
    certifications: certifications.length > 0,
    benefits: benefits.length > 0,
    experience: !!(experience.experienceLevel || experience.experienceYears),
    education: !!educationLevel,
    contract: !!contractType,
    department: !!department,
    workModel: !!workModel,
    seniority: !!seniority,
  });

  return {
    skills,
    languages,
    certifications,
    benefits,
    department,
    workModel,
    experienceLevel: experience.experienceLevel,
    experienceYears: experience.experienceYears,
    educationLevel,
    contractType,
    requiresDrivingLicence,
    requiresTravel,
    seniority,
    managementLevel,
    visaSponsorship,
    relocation,
    remoteEligible,
    businessFunction,
    sections,
    coverage,
  };
}

function computeCoverage(flags: Omit<EntityCoverage, 'score'>): EntityCoverage {
  const values = Object.values(flags) as boolean[];
  const score = Math.round((values.filter(Boolean).length / values.length) * 100);
  return { ...flags, score };
}
