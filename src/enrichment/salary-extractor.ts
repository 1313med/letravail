export interface ExtractedSalary {
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryNet?: boolean;
}

const SALARY_PATTERNS = [
  // Range: 15 000 - 20 000 MAD/mois
  /(\d[\d\s.,]*)\s*[-–àa]\s*(\d[\d\s.,]*)\s*(?:MAD|DH|DHS|dirhams?)\s*(?:\/\s*(?:mois|month)|par\s+mois|mensuel(?:le)?)?/i,
  // Single: 15000 MAD
  /(\d[\d\s.,]*)\s*(?:MAD|DH|DHS|dirhams?)\s*(?:\/\s*(?:mois|month)|par\s+mois|mensuel(?:le)?)?/i,
  // Annual: 180 000 MAD/an
  /(\d[\d\s.,]*)\s*(?:MAD|DH|DHS|dirhams?)\s*(?:\/\s*(?:an|année|year)|par\s+an|annuel(?:le)?)/i,
  // K format: 15K - 20K MAD
  /(\d+(?:[.,]\d+)?)\s*k\s*[-–àa]\s*(\d+(?:[.,]\d+)?)\s*k\s*(?:MAD|DH|DHS)/i,
];

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : Math.round(num);
}

export function extractSalary(text: string): ExtractedSalary {
  if (!text) return {};

  const isNet = /\bnet\b/i.test(text) && !/\bbrut\b/i.test(text.slice(0, text.toLowerCase().indexOf('net') + 20));
  const isBrut = /\bbrut\b/i.test(text);

  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[2]) {
      let min = parseAmount(match[1]!);
      let max = parseAmount(match[2]);
      if (/k/i.test(match[0])) {
        min *= 1000;
        max *= 1000;
      }
      if (min > 0 && max > 0 && max >= min) {
        const period = /\/\s*(?:an|année|year)|par\s+an|annuel/i.test(match[0]) ? 'annual' : 'monthly';
        return {
          salary: `${min} - ${max} MAD${period === 'monthly' ? '/mois' : '/an'}`,
          salaryMin: min,
          salaryMax: max,
          salaryCurrency: 'MAD',
          salaryPeriod: period,
          salaryNet: isNet ? true : isBrut ? false : undefined,
        };
      }
    }

    if (match[1]) {
      let amount = parseAmount(match[1]);
      if (/k/i.test(match[0])) amount *= 1000;
      if (amount > 0) {
        const period = /\/\s*(?:an|année|year)|par\s+an|annuel/i.test(match[0]) ? 'annual' : 'monthly';
        return {
          salary: `${amount} MAD${period === 'monthly' ? '/mois' : '/an'}`,
          salaryMin: amount,
          salaryMax: amount,
          salaryCurrency: 'MAD',
          salaryPeriod: period,
          salaryNet: isNet ? true : isBrut ? false : undefined,
        };
      }
    }
  }

  return {};
}
