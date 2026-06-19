import type { Page } from 'playwright';
import { cleanText } from '../utils/cleaning.js';

export interface RawListing {
  sourceJobId: string;
  title: string;
  city?: string;
  applicationUrl: string;
  description?: string;
  contractType?: string;
  publishedAt?: Date;
}

export async function extractListingsFromPage(
  page: Page,
  options: {
    listSelector: string;
    titleSelector: string;
    linkSelector: string;
    citySelector?: string;
    idFromUrl?: RegExp;
  },
): Promise<RawListing[]> {
  return page.$$eval(
    options.listSelector,
    (elements, selectors) => {
      const results: Array<{
        sourceJobId: string;
        title: string;
        city?: string;
        applicationUrl: string;
      }> = [];

      for (const el of elements) {
        const titleEl = el.querySelector(selectors.titleSelector);
        const linkEl = el.querySelector(selectors.linkSelector) as HTMLAnchorElement | null;
        const cityEl = selectors.citySelector
          ? el.querySelector(selectors.citySelector)
          : null;

        const title = titleEl?.textContent?.trim() ?? '';
        const href = linkEl?.href ?? '';
        if (!title || !href) continue;

        let sourceJobId = href;
        if (selectors.idPattern) {
          const match = href.match(new RegExp(selectors.idPattern));
          sourceJobId = match?.[1] ?? href;
        }

        const item: {
          sourceJobId: string;
          title: string;
          city?: string;
          applicationUrl: string;
        } = {
          sourceJobId,
          title,
          applicationUrl: href,
        };

        const city = cityEl?.textContent?.trim();
        if (city) item.city = city;

        results.push(item);
      }

      return results;
    },
    {
      titleSelector: options.titleSelector,
      linkSelector: options.linkSelector,
      citySelector: options.citySelector ?? '',
      idPattern: options.idFromUrl?.source ?? '',
    },
  );
}

export async function extractJobDetail(
  page: Page,
  url: string,
  selectors: {
    description: string;
    requirements?: string;
    contractType?: string;
    city?: string;
  },
): Promise<Partial<RawListing>> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  return page.evaluate((sel) => {
    const text = (selector: string) =>
      document.querySelector(selector)?.textContent?.trim() ?? '';

    return {
      description: text(sel.description),
      requirements: sel.requirements ? text(sel.requirements) : undefined,
      contractType: sel.contractType ? text(sel.contractType) : undefined,
      city: sel.city ? text(sel.city) : undefined,
    };
  }, selectors).then((detail) => ({
    description: cleanText(detail.description),
    requirements: detail.requirements ? cleanText(detail.requirements) : undefined,
    contractType: detail.contractType ? cleanText(detail.contractType) : undefined,
    city: detail.city ? cleanText(detail.city) : undefined,
  }));
}

export async function waitForAnySelector(page: Page, selectors: string[], timeout = 15_000): Promise<string | null> {
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / selectors.length });
      return selector;
    } catch {
      continue;
    }
  }
  return null;
}

export function parseFrenchDate(input: string): Date | undefined {
  const match = input.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
