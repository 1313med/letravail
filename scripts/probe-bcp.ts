import { chromium } from 'playwright';

const URL = 'https://bcp-cand.talent-soft.com/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=layer';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(4_000);

const data = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href]')]
    .map((a) => ({ t: a.textContent?.trim().slice(0, 80), h: (a as HTMLAnchorElement).href }))
    .filter((x) => x.t && x.t.length > 5);
  const jobLinks = links.filter((x) => /offre|emploi|agent|ingénieur/i.test(x.t + x.h));
  return {
    title: document.title,
    totalLinks: links.length,
    jobLinks: jobLinks.slice(0, 15),
    h3: [...document.querySelectorAll('h3')].map((h) => h.textContent?.trim()).slice(0, 10),
    bodySample: document.body?.innerText?.slice(0, 600),
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
