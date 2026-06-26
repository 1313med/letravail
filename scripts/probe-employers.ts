import { chromium } from 'playwright';

const SITES = [
  { name: 'intelcia', url: 'https://www.intelcia.com/fr/nous-rejoindre/' },
  { name: 'inwi', url: 'https://www.inwi.ma/fr/carrieres' },
  { name: 'orange', url: 'https://www.orange.ma/fr/orange-carrieres' },
  { name: 'iam', url: 'https://www.iam.ma/groupe-iam/carrieres' },
  { name: 'bcp', url: 'https://www.groupebcp.ma/carrieres' },
  { name: 'bmci', url: 'https://www.bmci.ma/fr/carrieres' },
  { name: 'marjane', url: 'https://www.marjane.ma/carrieres' },
  { name: 'capgemini', url: 'https://www.capgemini.com/ma-fr/carrieres/' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const site of SITES) {
  const apis: string[] = [];
  page.on('response', (res) => {
    const u = res.url();
    if (/api|job|offre|recrut|posting|graphql|smartrecruiters|greenhouse|lever|workday|csod/i.test(u) && res.status() === 200) {
      apis.push(u.slice(0, 120));
    }
  });
  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const data = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].filter((a) => {
        const h = (a as HTMLAnchorElement).href;
        const t = a.textContent?.trim() ?? '';
        return /offre|emploi|job|poste|carriere|requisition|vacanc/i.test(h + t) && t.length > 5;
      }).slice(0, 8).map((a) => ({ t: a.textContent?.trim().slice(0, 60), h: (a as HTMLAnchorElement).href.slice(0, 100) }));
      const iframes = [...document.querySelectorAll('iframe')].map((f) => (f as HTMLIFrameElement).src).slice(0, 3);
      return { title: document.title, links, iframes, bodyLen: document.body?.innerText?.length ?? 0 };
    });
    console.log(`\n=== ${site.name} ===`, page.url());
    console.log('APIs:', [...new Set(apis)].slice(0, 6).join('\n  ') || 'none');
    console.log('Links:', JSON.stringify(data.links, null, 2));
    if (data.iframes.length) console.log('Iframes:', data.iframes);
  } catch (e) {
    console.log(`\n=== ${site.name} FAIL ===`, e instanceof Error ? e.message : e);
  }
  page.removeAllListeners('response');
}

await browser.close();
