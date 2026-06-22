import { chromium } from 'playwright';
import readline from 'node:readline';

const OUTPUT = 'linkedin-auth.json';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

async function main(): Promise<void> {
  console.log('\nLinkedIn login — save session for scraper\n');
  console.log('A browser will open. Please:');
  console.log('  1. Log in to LinkedIn');
  console.log('  2. Open: https://www.linkedin.com/jobs/search/?location=Morocco');
  console.log('  3. Confirm you see job listings');
  console.log('  4. Return here and press ENTER\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  await ask('Press ENTER after login + Morocco jobs page works... ');

  await context.storageState({ path: OUTPUT });
  console.log(`\nSaved ${OUTPUT} — add to .env: LINKEDIN_STORAGE_STATE=./${OUTPUT}\n`);

  await browser.close();
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
