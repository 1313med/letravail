import { getPrisma } from './lib/prisma.js';
import { CompanyRepository } from './repositories/company.repository.js';
import { JobRepository } from './repositories/job.repository.js';
import { LocationRepository } from './repositories/location.repository.js';
import { ScrapeLogRepository } from './repositories/scrape-log.repository.js';
import { TagRepository } from './repositories/tag.repository.js';
import { ScrapeService } from './services/scrape.service.js';
import { PagePool } from './lib/browser/page-pool.js';
import { scraperRegistry } from './scrapers/registry.js';

export interface Container {
  scrapeService: ScrapeService;
  pagePool: PagePool;
}

let container: Container | null = null;

export function createContainer(): Container {
  const db = getPrisma();
  const companyRepo = new CompanyRepository(db);
  const locationRepo = new LocationRepository(db);
  const tagRepo = new TagRepository(db);
  const jobRepo = new JobRepository(db, companyRepo, locationRepo, tagRepo);
  const scrapeLogRepo = new ScrapeLogRepository(db);
  const pagePool = new PagePool();

  const scrapeService = new ScrapeService(jobRepo, scrapeLogRepo, scraperRegistry, pagePool);

  return { scrapeService, pagePool };
}

export function getContainer(): Container {
  container ??= createContainer();
  return container;
}

export function resetContainer(): void {
  container = null;
}
