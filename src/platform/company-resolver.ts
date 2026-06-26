/**
 * Canonical company resolution — fuzzy matching + alias index.
 */
import { slugifyEntity } from '../utils/slug.js';

export interface CompanyResolution {
  canonicalName: string;
  confidence: number;
  matchedVia: 'exact' | 'alias' | 'fuzzy' | 'new';
  aliasUsed?: string;
}

const CANONICAL_REGISTRY: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'Attijariwafa Bank', aliases: ['attijariwafa bank', 'attijari wafa bank', 'attijariwafa', 'attijari wafa', 'awb', 'attijari bank', 'groupe attijariwafa'] },
  { canonical: 'CIH Bank', aliases: ['cih bank', 'cih', 'credit immobilier et hotelier'] },
  { canonical: 'Bank of Africa', aliases: ['bank of africa', 'boa', 'bmce bank', 'bmce'] },
  { canonical: 'BMCI', aliases: ['bmci', 'bnpp maroc'] },
  { canonical: 'Banque Populaire', aliases: ['banque populaire', 'groupe bcp', 'bcp', 'chaabi bank'] },
  { canonical: 'Crédit du Maroc', aliases: ['credit du maroc', 'cdm'] },
  { canonical: 'Crédit Agricole du Maroc', aliases: ['credit agricole du maroc', 'cam'] },
  { canonical: 'CFG Bank', aliases: ['cfg bank', 'cfg'] },
  { canonical: 'Société Générale Maroc', aliases: ['societe generale maroc', 'sg maroc'] },
  { canonical: 'Al Barid Bank', aliases: ['al barid bank', 'barid bank'] },
  { canonical: 'Maroc Telecom', aliases: ['maroc telecom', 'iam'] },
  { canonical: 'Orange Maroc', aliases: ['orange maroc', 'orange'] },
  { canonical: 'Inwi', aliases: ['inwi', 'wana'] },
  { canonical: 'OCP Group', aliases: ['ocp', 'ocp group'] },
  { canonical: 'Royal Air Maroc', aliases: ['royal air maroc', 'ram'] },
  { canonical: 'Capgemini', aliases: ['capgemini', 'capgemini maroc'] },
  { canonical: 'CGI', aliases: ['cgi', 'cgi maroc'] },
  { canonical: 'DXC Technology', aliases: ['dxc technology', 'dxc'] },
  { canonical: 'Accenture', aliases: ['accenture', 'accenture maroc'] },
  { canonical: 'Deloitte', aliases: ['deloitte', 'deloitte maroc'] },
  { canonical: 'PwC', aliases: ['pwc', 'pwc maroc'] },
  { canonical: 'EY', aliases: ['ey', 'ey maroc'] },
  { canonical: 'KPMG', aliases: ['kpmg', 'kpmg maroc'] },
  { canonical: 'Intelcia', aliases: ['intelcia'] },
  { canonical: 'Comdata', aliases: ['comdata', 'comdata maroc'] },
  { canonical: 'Marjane', aliases: ['marjane', 'marjane group'] },
  { canonical: 'LabelVie', aliases: ['labelvie', 'label vie'] },
  { canonical: 'Renault Maroc', aliases: ['renault maroc', 'renault'] },
  { canonical: 'Stellantis', aliases: ['stellantis', 'stellantis maroc'] },
];

const ALIAS_INDEX = new Map<string, string>();

for (const entry of CANONICAL_REGISTRY) {
  for (const alias of entry.aliases) {
    ALIAS_INDEX.set(normalizeCompanyKey(alias), entry.canonical);
  }
  ALIAS_INDEX.set(normalizeCompanyKey(entry.canonical), entry.canonical);
}

export function normalizeCompanyKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCompany(rawName: string): CompanyResolution {
  const key = normalizeCompanyKey(rawName);
  if (!key) return { canonicalName: rawName.trim(), confidence: 0, matchedVia: 'new' };

  const exact = ALIAS_INDEX.get(key);
  if (exact) return { canonicalName: exact, confidence: 1, matchedVia: 'exact', aliasUsed: rawName };

  for (const [alias, canonical] of ALIAS_INDEX) {
    if (key.includes(alias) || alias.includes(key)) {
      const confidence = Math.min(alias.length / key.length, key.length / alias.length, 1) * 0.9;
      if (confidence >= 0.6) {
        return { canonicalName: canonical, confidence, matchedVia: 'alias', aliasUsed: alias };
      }
    }
  }

  return { canonicalName: rawName.trim(), confidence: 0.5, matchedVia: 'new' };
}

export function getAllCanonicalAliases(): Array<{ canonical: string; alias: string }> {
  const result: Array<{ canonical: string; alias: string }> = [];
  for (const entry of CANONICAL_REGISTRY) {
    for (const alias of entry.aliases) {
      result.push({ canonical: entry.canonical, alias });
    }
  }
  return result;
}

export function canonicalSlug(name: string): string {
  return slugifyEntity(name);
}
