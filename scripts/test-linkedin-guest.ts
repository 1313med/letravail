import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();
const j = await db.job.findFirst({ where: { source: 'linkedin' }, select: { sourceJobId: true, title: true } });
if (!j) { console.log('no linkedin jobs'); process.exit(0); }

const res = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${j.sourceJobId}`, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'fr-FR,fr;q=0.9',
  },
});
const text = await res.text();
console.log('job', j.title, 'id', j.sourceJobId);
console.log('status', res.status, 'html len', text.length);
const markup = text.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i);
console.log('markup found', !!markup, 'len', markup?.[1]?.length ?? 0);
if (markup) console.log(markup[1].slice(0, 300));
await db.$disconnect();
