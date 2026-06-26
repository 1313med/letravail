import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';

const db = getPrisma();

const total = await db.company.count();
const enriched = await db.company.count({
  where: {
    OR: [
      { websiteUrl: { not: null } },
      { linkedinUrl: { not: null } },
      { industry: { not: null } },
      { careerPageUrl: { not: null } },
    ],
  },
});

const aliases = await db.companyAlias.count();
const unresolved = await db.companyAlias.findMany({
  where: { confidence: { lt: 0.7 } },
  take: 20,
  include: { company: { select: { name: true } } },
});

const potentialDupes = await db.$queryRaw<Array<{ name: string; cnt: bigint }>>`
  SELECT LOWER(TRIM(company)) as name, COUNT(*)::bigint as cnt
  FROM jobs WHERE "isActive" = true
  GROUP BY LOWER(TRIM(company))
  HAVING COUNT(DISTINCT company) > 1 OR COUNT(*) > 1
  ORDER BY cnt DESC
  LIMIT 15
`;

const lines = [
  '# Company Intelligence Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Enrichment Coverage',
  `- Total companies: **${total}**`,
  `- Enriched (website/linkedin/industry/careers): **${enriched}** (${total > 0 ? ((enriched / total) * 100).toFixed(1) : 0}%)`,
  `- Registered aliases: **${aliases}**`,
  '',
  '## Unresolved Aliases (low confidence)',
  '',
];

if (unresolved.length === 0) {
  lines.push('_None pending review._');
} else {
  for (const a of unresolved) {
    lines.push(`- "${a.alias}" → ${a.company.name} (confidence: ${a.confidence})`);
  }
}

lines.push('', '## Top Employers by Active Jobs', '');
const topEmployers = await db.job.groupBy({
  by: ['company'],
  where: { isActive: true },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 20,
});
for (const e of topEmployers) {
  const co = await db.company.findFirst({ where: { name: e.company } });
  const status = co?.websiteUrl ? 'enriched' : 'needs enrichment';
  lines.push(`- ${e.company}: ${e._count.id} jobs (${status})`);
}

lines.push('', '## Companies Needing Manual Review', '');
for (const e of topEmployers.filter((t) => !t.company || t.company.length < 3).slice(0, 10)) {
  lines.push(`- "${e.company}" (${e._count.id} jobs)`);
}

const reportDir = join(process.cwd(), 'reports');
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'company-intelligence-report.md'), lines.join('\n'), 'utf-8');
console.log('Wrote reports/company-intelligence-report.md');

await db.$disconnect();
