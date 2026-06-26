import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { onboardEmployer } from '../src/platform/employer-onboarding.js';

const url = process.argv[2];
const companyName = process.argv[3];

if (!url) {
  console.log('Usage: npm run onboard:employer -- <website-url> [company-name]');
  process.exit(1);
}

console.log(`Onboarding: ${url}\n`);
const report = await onboardEmployer(url, companyName);

const lines = [
  '# Employer Onboarding Report',
  `Generated: ${new Date().toISOString()}`,
  '',
  `**Input:** ${report.inputUrl}`,
  report.companyName ? `**Company:** ${report.companyName}` : '',
  `**Confidence:** ${report.confidenceScore}/100`,
  '',
  '## Detection',
  `- Careers page: ${report.careersPageUrl ?? 'not found'}`,
  `- ATS detected: **${report.atsDetected}**`,
  `- Crawl strategy: **${report.crawlStrategy}**`,
  `- Recommended adapter: \`${report.recommendedAdapter}\``,
  `- Estimated volume: ${report.estimatedJobVolume}`,
  `- Technical complexity: ${report.technicalComplexity}`,
  `- Maintenance effort: ${report.maintenanceEffort}`,
  `- robots.txt allowed: ${report.robotsAllowed}`,
  `- GraphQL detected: ${report.graphqlDetected}`,
  `- Structured data (JobPosting): ${report.structuredData}`,
  '',
];

if (report.greenhouseToken) lines.push(`- Greenhouse board: \`${report.greenhouseToken}\``);
if (report.leverSlug) lines.push(`- Lever slug: \`${report.leverSlug}\``);
if (report.workdayConfig) {
  lines.push(`- Workday: host=\`${report.workdayConfig.host}\`, site=\`${report.workdayConfig.site}\``);
}
if (report.apiEndpoints.length > 0) {
  lines.push('', '## API Endpoints', '');
  for (const ep of report.apiEndpoints) lines.push(`- ${ep}`);
}

if (report.issues.length > 0) {
  lines.push('', '## Issues', '');
  for (const i of report.issues) lines.push(`- ${i}`);
}

lines.push('', '## Next Steps', '');
for (const s of report.nextSteps) lines.push(`1. ${s}`);

const dir = join(process.cwd(), 'reports');
mkdirSync(dir, { recursive: true });
const slug = (companyName ?? new URL(url).hostname).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const path = join(dir, `onboarding-${slug}.md`);
writeFileSync(path, lines.filter(Boolean).join('\n'), 'utf-8');

console.log(lines.filter(Boolean).join('\n'));
console.log(`\nWritten: ${path}`);
