/**
 * Automatic employer discovery with ATS intelligence persistence.
 * Usage: npm run discover:employers [-- --persist]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { discoverEmployers } from '../src/platform/employer-discovery.js';
import { refreshAllPriorities } from '../src/platform/source-priority-engine.js';

const persist = process.argv.includes('--persist');
const db = getPrisma();

const discovered = await discoverEmployers(db, { persist });
await refreshAllPriorities(db);

const lines = [
  '# Employer Discovery Report',
  `Generated: ${new Date().toISOString()}`,
  `Persisted: ${persist}`,
  '',
  `Found **${discovered.length}** employers with confidence ≥ 40`,
  '',
  '| Company | ATS | Confidence | Volume est. | Registered | Careers URL |',
  '|---------|-----|------------|-------------|------------|-------------|',
];

for (const d of discovered) {
  lines.push(
    `| ${d.companyName} | ${d.atsPlatform} | ${d.confidence} | ${d.jobCountEstimate} | ${d.alreadyRegistered ? 'yes' : '**no**'} | ${d.careersPageUrl ?? '—'} |`,
  );
}

const newEmployers = discovered.filter((d) => !d.alreadyRegistered);
if (newEmployers.length > 0) {
  lines.push('', '## Onboarding Recommendations', '');
  for (const d of newEmployers.slice(0, 15)) {
    lines.push(`- **${d.companyName}** → \`${d.recommendedSourceName}\` (${d.atsPlatform}, confidence ${d.confidence})`);
  }
}

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
const path = join(dir, 'discovery-report.md');
writeFileSync(path, lines.join('\n'), 'utf-8');

console.log(lines.join('\n'));
console.log(`\nWritten: ${path}`);

await disconnectPrisma();
