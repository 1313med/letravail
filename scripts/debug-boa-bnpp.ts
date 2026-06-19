import { chromium } from 'playwright';

async function probe(url: string, label: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('response', async (res) => {
    if (/job|offre|recrut|career|vacanc/i.test(res.url()) && res.headers()['content-type']?.includes('json')) {
      console.log('API', res.status(), res.url());
      try {
        console.log((await res.text()).slice(0, 500));
      } catch { /* */ }
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(8000);
  console.log(`\n=== ${label} ===`, page.url());
  const data = await page.evaluate(() => ({
    text: document.body?.innerText?.slice(0, 1500),
    links: [...document.querySelectorAll('a')]
      .filter((a) => /charg|analyste|manager|offre|job|requisition/i.test((a as HTMLAnchorElement).href + a.textContent))
      .slice(0, 15)
      .map((a) => ({ t: (a as HTMLAnchorElement).textContent?.trim().slice(0, 80), h: (a as HTMLAnchorElement).href })),
  }));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

await probe('https://www.bankofafrica.ma/fr/groupe/nous-rejoindre', 'boa');
await probe('https://group.bnpparibas/emploi-carriere/toutes-offres-emploi/maroc', 'bnpp');
