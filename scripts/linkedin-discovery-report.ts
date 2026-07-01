#!/usr/bin/env tsx
/**
 * LinkedIn Employer Discovery report — lists discovered employers and pipeline stats.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPrisma } from '../src/lib/prisma.js';
import { EmployerDiscoveryRepository } from '../src/repositories/employer-discovery.repository.js';

async function main(): Promise<void> {
  const db = getPrisma();
  const repo = new EmployerDiscoveryRepository(db);

  const stats = await repo.getStats();
  const recent = await repo.getRecent(100);
  const pending = await repo.getPendingOnboarding(20);

  const lines = [
    '# LinkedIn Employer Discovery Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Pipeline Stats',
    `- Total discovered employers: **${stats.total}**`,
    `- New today: **${stats.newToday}**`,
    `- Actively hiring: **${stats.activelyHiring}**`,
    `- Probed (ATS onboarding done): **${stats.probed}**`,
    `- Registered in catalog: **${stats.registered}**`,
    `- Pending onboarding: **${pending.length}**`,
    '',
    '## Recent Discoveries',
    '',
    '| Company | LinkedIn | Website | Jobs Seen | Status | Hiring | Source | Last Seen |',
    '|---------|----------|---------|-----------|--------|--------|--------|-----------|',
    ...recent.map((d) =>
      `| ${d.companyName} | ${d.linkedinUrl ? `[link](${d.linkedinUrl})` : '—'} | ${d.websiteUrl ?? '—'} | ${d.jobCountSeen} | ${d.onboardingStatus} | ${d.hiringStatus} | ${d.discoverySource} | ${d.lastSeenAt.toISOString().slice(0, 10)} |`,
    ),
    '',
    '## Pending Onboarding',
    '',
    '| Company | Website | Jobs Seen | Recommended Source |',
    '|---------|---------|-----------|-------------------|',
    ...pending.map((d) =>
      `| ${d.companyName} | ${d.websiteUrl ?? '—'} | ${d.jobCountSeen} | ${d.recommendedSourceName ?? '—'} |`,
    ),
    '',
  ];

  const reportDir = join(process.cwd(), 'reports');
  mkdirSync(reportDir, { recursive: true });
  const path = join(reportDir, 'linkedin-discovery-report.md');
  writeFileSync(path, lines.join('\n'), 'utf-8');

  console.log(lines.join('\n'));
  console.log(`\nReport written to ${path}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => getPrisma().$disconnect());
