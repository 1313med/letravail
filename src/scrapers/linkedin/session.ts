import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export function getLinkedInStoragePath(): string {
  return resolve(process.cwd(), config.linkedinStorageState);
}

export async function getLinkedInContext(): Promise<BrowserContext> {
  if (context) return context;

  const storagePath = getLinkedInStoragePath();
  if (!existsSync(storagePath)) {
    throw new Error(
      `LinkedIn session not found at ${storagePath}. Run: npx tsx scripts/linkedin-login.ts`,
    );
  }

  browser = await chromium.launch({
    headless: config.browserHeadless,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  context = await browser.newContext({
    storageState: storagePath,
    locale: 'fr-FR',
    viewport: { width: 1280, height: 900 },
  });

  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font') {
      return route.abort();
    }
    return route.continue();
  });

  logger.info({ storagePath }, 'LinkedIn browser session loaded');
  return context;
}

export async function closeLinkedInBrowser(): Promise<void> {
  await context?.close();
  await browser?.close();
  context = null;
  browser = null;
}
