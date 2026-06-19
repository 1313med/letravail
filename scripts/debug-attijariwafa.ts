import { chromium } from 'playwright';

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const apiCalls: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('rec-job-search/external/jobs')) {
      console.log('\n--- REQUEST ---');
      console.log(request.method(), url);
      console.log('headers', JSON.stringify(request.headers(), null, 2));
      console.log('post', request.postData());
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (/api|graphql|job|offer|offre|vacanc|search|position/i.test(url)) {
      apiCalls.push(`${response.status()} ${url}`);
      try {
        const ct = response.headers()['content-type'] ?? '';
        if (ct.includes('json')) {
          const body = await response.text();
          console.log('\n--- API ---');
          console.log(url);
          console.log(body.slice(0, 3000));
        }
      } catch {
        /* ignore */
      }
    }
  });

  await page.goto('https://recrutement.attijariwafa.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForTimeout(8_000);

  const snapshot = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    text: document.body?.innerText?.slice(0, 2000),
    jobLike: Array.from(document.querySelectorAll('a, [class*="job"], [class*="offer"], [class*="opening"], [data-testid]'))
      .slice(0, 40)
      .map((el) => ({
        tag: el.tagName,
        class: (el as HTMLElement).className?.toString?.().slice(0, 80),
        text: el.textContent?.trim().slice(0, 120),
        href: (el as HTMLAnchorElement).href || undefined,
      })),
  }));

  console.log('SNAPSHOT', JSON.stringify(snapshot, null, 2));
  console.log('\nAPI CALLS', apiCalls.join('\n'));

  await browser.close();
}

main().catch(console.error);
