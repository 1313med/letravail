import { chromium } from 'playwright';

const SITES = [
  { name: 'cih', url: 'https://www.cihbank.ma/fr/Pages/Carrieres.aspx' },
  { name: 'bmci', url: 'https://www.bmci.ma/fr/carrieres' },
  { name: 'boa', url: 'https://www.bankofafrica.ma/fr/carrieres' },
  { name: 'orange', url: 'https://www.orange.ma/fr/orange-carrieres' },
  { name: 'marjane', url: 'https://www.marjane.ma/carrieres' },
  { name: 'inwi', url: 'https://www.inwi.ma/fr/carrieres' },
];

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const site of SITES) {
    const apis: string[] = [];
    page.on('response', (res) => {
      const url = res.url();
      if (/job|offre|recrut|career|csod|vacanc|requisition/i.test(url) && res.status() === 200) {
        apis.push(url);
      }
    });

    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(4000);
      console.log(`\n=== ${site.name} ===`);
      console.log('Final URL:', page.url());
      console.log('APIs:', [...new Set(apis)].slice(0, 8).join('\n  '));
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="requisition"], a[href*="offre"], a[href*="job"], a.highlitedOffres-a')]
          .slice(0, 8)
          .map((a) => ({ t: (a as HTMLAnchorElement).textContent?.trim().slice(0, 60), h: (a as HTMLAnchorElement).href })),
      );
      console.log('Job-like links:', JSON.stringify(links, null, 2));
    } catch (e) {
      console.log(`\n=== ${site.name} FAILED ===`, e instanceof Error ? e.message : e);
    }
    page.removeAllListeners('response');
  }

  await browser.close();
}

main().catch(console.error);
