import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';

const reportPath = join(process.cwd(), 'reports', 'linkedin-quality-report.md');
if (existsSync(reportPath)) {
  console.log(readFileSync(reportPath, 'utf-8'));
} else {
  console.log('No LinkedIn quality report yet. Run: npm run scrape:linkedin');
}

const db = getPrisma();
const stats = await db.job.aggregate({
  where: { source: 'linkedin', isActive: true },
  _avg: { description: true, qualityScore: true },
  _count: { id: true },
});
console.log('\n## DB State (linkedin)');
console.log(`Active jobs: ${stats._count.id}`);
console.log(`Avg description length: ${Math.round(stats._avg.description ?? 0)}`);
console.log(`Avg quality score: ${(stats._avg.qualityScore ?? 0).toFixed(1)}`);

await db.$disconnect();
