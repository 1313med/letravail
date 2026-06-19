import { chromium } from 'playwright';

async function probe(url: string, label: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log(`\n=== ${label} ===`, page.url());
  const data = await page.evaluate(() => ({
    tables: document.querySelectorAll('table').length,
    rows: [...document.querySelectorAll('table tr')].slice(0, 5).map((r) => r.textContent?.trim().slice(0, 120)),
    links: [...document.querySelectorAll('a')].slice(0, 20).map((a) => ({
      t: (a as HTMLAnchorElement).textContent?.trim().slice(0, 70),
      h: (a as HTMLAnchorElement).href,
    })),
    jobCards: [...document.querySelectorAll('[class*="job"], [class*="offer"], [class*="offre"], article')]
      .slice(0, 5)
      .map((el) => el.textContent?.trim().slice(0, 100)),
  }));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

await probe('https://recrutement.cihbank.ma/front-offres.html', 'cih');
await probe('https://group.bnpparibas/emploi-carriere/toutes-offres-emploi/maroc', 'bnpp-maroc');
