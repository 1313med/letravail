import { normalizeCity } from '../utils/cleaning.js';

export interface NormalizedLocation {
  city: string;
  country: string;
  region?: string;
  canonicalCity?: string;
}

const CITY_REGION_MAP: Record<string, { region: string; canonicalCity: string }> = {
  Casablanca: { region: 'Casablanca-Settat', canonicalCity: 'Casablanca' },
  Mohammedia: { region: 'Casablanca-Settat', canonicalCity: 'Mohammedia' },
  Settat: { region: 'Casablanca-Settat', canonicalCity: 'Settat' },
  'El Jadida': { region: 'Casablanca-Settat', canonicalCity: 'El Jadida' },
  Rabat: { region: 'Rabat-Salé-Kénitra', canonicalCity: 'Rabat' },
  Salé: { region: 'Rabat-Salé-Kénitra', canonicalCity: 'Salé' },
  Kénitra: { region: 'Rabat-Salé-Kénitra', canonicalCity: 'Kénitra' },
  Témara: { region: 'Rabat-Salé-Kénitra', canonicalCity: 'Témara' },
  Marrakech: { region: 'Marrakech-Safi', canonicalCity: 'Marrakech' },
  Safi: { region: 'Marrakech-Safi', canonicalCity: 'Safi' },
  Fès: { region: 'Fès-Meknès', canonicalCity: 'Fès' },
  Meknès: { region: 'Fès-Meknès', canonicalCity: 'Meknès' },
  Tanger: { region: 'Tanger-Tétouan-Al Hoceïma', canonicalCity: 'Tanger' },
  Tétouan: { region: 'Tanger-Tétouan-Al Hoceïma', canonicalCity: 'Tétouan' },
  'Al Hoceima': { region: 'Tanger-Tétouan-Al Hoceïma', canonicalCity: 'Al Hoceima' },
  Agadir: { region: 'Souss-Massa', canonicalCity: 'Agadir' },
  Oujda: { region: 'Oriental', canonicalCity: 'Oujda' },
  Nador: { region: 'Oriental', canonicalCity: 'Nador' },
  Laayoune: { region: 'Laâyoune-Sakia El Hamra', canonicalCity: 'Laayoune' },
  Dakhla: { region: 'Dakhla-Oued Ed-Dahab', canonicalCity: 'Dakhla' },
  'Beni Mellal': { region: 'Béni Mellal-Khénifra', canonicalCity: 'Beni Mellal' },
  Khénifra: { region: 'Béni Mellal-Khénifra', canonicalCity: 'Khénifra' },
};

const REMOTE_PATTERNS = /\b(télétravail|teletravail|remote|hybride|hybrid|à distance|from home)\b/i;

export function normalizeLocation(city: string, country = 'Morocco'): NormalizedLocation {
  const cleaned = normalizeCity(city);
  const mapping = CITY_REGION_MAP[cleaned];

  return {
    city: cleaned,
    country: country || 'Morocco',
    region: mapping?.region,
    canonicalCity: mapping?.canonicalCity ?? cleaned,
  };
}

export function isRemoteLocation(text: string): boolean {
  return REMOTE_PATTERNS.test(text);
}
