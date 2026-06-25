export interface QualityDimensions {
  descriptionScore: number;
  skillCoverage: number;
  experienceCoverage: number;
  locationCoverage: number;
  salaryCoverage: number;
  contractCoverage: number;
  educationCoverage: number;
  companyCoverage: number;
  overallScore: number;
}

export interface QualityInput {
  description: string;
  title: string;
  skillCount: number;
  hasExperience: boolean;
  hasLocation: boolean;
  hasSalary: boolean;
  hasContract: boolean;
  hasEducation: boolean;
  hasCompanyEnrichment: boolean;
}

const DESC_TARGET = 500;

export function scoreJobQuality(input: QualityInput): QualityDimensions {
  const descLen = input.description.length;
  const titleLen = input.title.length;
  const isTitleOnly = input.description.trim() === input.title.trim();

  let descriptionScore = 0;
  if (!isTitleOnly) {
    descriptionScore = Math.min(100, Math.round((descLen / DESC_TARGET) * 100));
  } else if (descLen > titleLen) {
    descriptionScore = 20;
  }

  const skillCoverage = input.skillCount > 0 ? Math.min(100, input.skillCount * 25) : 0;
  const experienceCoverage = input.hasExperience ? 100 : 0;
  const locationCoverage = input.hasLocation ? 100 : 0;
  const salaryCoverage = input.hasSalary ? 100 : 0;
  const contractCoverage = input.hasContract ? 100 : 0;
  const educationCoverage = input.hasEducation ? 100 : 0;
  const companyCoverage = input.hasCompanyEnrichment ? 100 : 0;

  const overallScore = Math.round(
    descriptionScore * 0.35
    + skillCoverage * 0.15
    + experienceCoverage * 0.1
    + locationCoverage * 0.1
    + contractCoverage * 0.1
    + educationCoverage * 0.1
    + salaryCoverage * 0.05
    + companyCoverage * 0.05,
  );

  return {
    descriptionScore,
    skillCoverage,
    experienceCoverage,
    locationCoverage,
    salaryCoverage,
    contractCoverage,
    educationCoverage,
    companyCoverage,
    overallScore,
  };
}
