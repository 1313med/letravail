import { getPrisma } from './lib/prisma.js';
import { CompanyRepository } from './repositories/company.repository.js';
import { CompanyAliasRepository } from './repositories/company-alias.repository.js';
import { JobRepository } from './repositories/job.repository.js';
import { LocationRepository } from './repositories/location.repository.js';
import { ScrapeLogRepository } from './repositories/scrape-log.repository.js';
import { SkillRepository } from './repositories/skill.repository.js';
import { SourceProfileRepository } from './repositories/source-profile.repository.js';
import { TagRepository } from './repositories/tag.repository.js';
import { ScrapeService } from './services/scrape.service.js';
import { QualityDashboardService } from './platform/quality-dashboard.service.js';
import { PagePool } from './lib/browser/page-pool.js';
import { scraperRegistry } from './scrapers/registry.js';

export interface Container {
  scrapeService: ScrapeService;
  pagePool: PagePool;
  sourceProfileRepo: SourceProfileRepository;
  qualityDashboard: QualityDashboardService;
  companyAliasRepo: CompanyAliasRepository;
}

let container: Container | null = null;

export function createContainer(): Container {
  const db = getPrisma();
  const companyRepo = new CompanyRepository(db);
  const companyAliasRepo = new CompanyAliasRepository(db);
  const locationRepo = new LocationRepository(db);
  const tagRepo = new TagRepository(db);
  const skillRepo = new SkillRepository(db);
  const jobRepo = new JobRepository(db, companyRepo, locationRepo, tagRepo, skillRepo);
  const scrapeLogRepo = new ScrapeLogRepository(db);
  const sourceProfileRepo = new SourceProfileRepository(db);
  const qualityDashboard = new QualityDashboardService(db);
  const pagePool = new PagePool();

  const scrapeService = new ScrapeService(
    jobRepo,
    scrapeLogRepo,
    sourceProfileRepo,
    scraperRegistry,
    pagePool,
  );

  return { scrapeService, pagePool, sourceProfileRepo, qualityDashboard, companyAliasRepo };
}

export function getContainer(): Container {
  container ??= createContainer();
  return container;
}

export function resetContainer(): void {
  container = null;
}
