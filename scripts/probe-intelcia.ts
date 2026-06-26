import { chromium } from 'playwright';

const URL = 'https://careers.intelcia.com/fr-ma/offres-emploi?sp=true';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const apis: string[] = [];

page.on('response', (res) => {
  const u = res.url();
  if (/api|offre|job|posting|graphql|search|talent|recruit/i.test(u) && res.status() === 200) {
    apis.push(`${res.status()} ${u.slice(0, 180)}`);
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(5_000);

const data = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a')]
    .filter((a) => {
      const h = (a as HTMLAnchorElement).href;
      const t = a.textContent?.trim() ?? '';
      return t.length > 5 && /offre|emploi|job|poste|detail|vacanc/i.test(h + t);
    })
    .slice(0, 15)
    .map((a) => ({ t: a.textContent?.trim().slice(0, 80), h: (a as HTMLAnchorElement).href }));

  const cards = [...document.querySelectorAll('article, li, [class*="job"], [class*="offre"], .card')]
    .slice(0, 5)
    .map((el) => el.textContent?.trim().slice(0, 120));

  return {
    title: document.title,
    url: location.href,
    links,
    cards,
    bodySample: document.body?.innerText?.slice(0, 800),
  };
});

console.log('APIs:', [...new Set(apis)].join('\n  ') || 'none');
console.log(JSON.stringify(data, null, 2));
await browser.close();
