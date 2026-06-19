import type { PagePool } from '../lib/browser/page-pool.js';
import type { ScrapeCategory } from '../config/index.js';
import { AttijariwafaScraper } from './banks/attijariwafa.scraper.js';
import { BoaScraper } from './banks/boa.scraper.js';
import { BmciScraper } from './banks/bmci.scraper.js';
import { CihScraper } from './banks/cih.scraper.js';
import { RamScraper } from './airlines/ram.scraper.js';
import { AutohallScraper, RenaultScraper, StellantisScraper } from './automotive/index.js';
import {
  AnapecScraper,
  EmploiPublicScraper,
  MinistereEducationScraper,
  MinistereInterieurScraper,
  MinistereJusticeScraper,
  MinistereSanteScraper,
} from './government/index.js';
import { BimScraper, LabelvieScraper, MarjaneScraper } from './retail/index.js';
import { InwiScraper, MarocTelecomScraper, OrangeScraper } from './telecom/index.js';
import { CapgeminiScraper, CgiScraper, DxcScraper } from './technology/index.js';
import { CadiAyyadScraper, HassanIIScraper, MohammedVScraper } from './universities/index.js';
import type { ScraperRegistration } from '../services/scrape.service.js';

type ScraperCtor = new (pagePool?: PagePool) => import('./base.scraper.js').BaseScraper;

function register(
  ctor: ScraperCtor,
  schedule: ScraperRegistration['schedule'] = 'every6hours',
): ScraperRegistration {
  const instance = new ctor();
  return {
    sourceName: instance.sourceName,
    category: instance.category as ScrapeCategory,
    factory: (pagePool) => new ctor(pagePool),
    schedule,
  };
}

export const scraperRegistry: ScraperRegistration[] = [
  register(AttijariwafaScraper),
  register(CihScraper),
  register(BoaScraper),
  register(BmciScraper),
  register(InwiScraper),
  register(MarocTelecomScraper),
  register(OrangeScraper),
  register(RenaultScraper),
  register(StellantisScraper),
  register(AutohallScraper),
  register(MarjaneScraper),
  register(BimScraper),
  register(LabelvieScraper),
  register(RamScraper),
  register(CapgeminiScraper),
  register(CgiScraper),
  register(DxcScraper),
  register(AnapecScraper),
  register(EmploiPublicScraper),
  register(MinistereSanteScraper),
  register(MinistereEducationScraper),
  register(MinistereJusticeScraper),
  register(MinistereInterieurScraper, 'daily'),
  register(MohammedVScraper, 'daily'),
  register(HassanIIScraper, 'daily'),
  register(CadiAyyadScraper, 'daily'),
];

export function getSourcesByCategory(category: ScrapeCategory): string[] {
  return scraperRegistry.filter((r) => r.category === category).map((r) => r.sourceName);
}
