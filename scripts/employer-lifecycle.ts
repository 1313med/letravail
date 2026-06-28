/**
 * Employer lifecycle CLI — Sprint 7 autonomous activation.
 * Usage:
 *   npm run employer:activate
 *   npm run employer:health
 *   npm run employer:validate
 *   npm run employer:retry
 *   npm run employer:metrics
 */
import { getPrisma, disconnectPrisma } from '../src/lib/prisma.js';
import { getContainer } from '../src/container.js';
import { EmployerActivationEngine } from '../src/platform/employer-activation-engine.js';

const command = process.argv[2] ?? 'metrics';
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 15);

const db = getPrisma();
const { scrapeService } = getContainer();
const engine = new EmployerActivationEngine(db, scrapeService);

try {
  switch (command) {
    case 'activate': {
      console.log(`Activating READY employers (limit ${limit})...\n`);
      const decisions = await engine.activateReadyEmployers(limit);
      printDecisions(decisions);
      break;
    }
    case 'health': {
      console.log(`Recalculating health (limit ${limit})...\n`);
      const decisions = await engine.recalculateHealth(limit);
      printDecisions(decisions);
      break;
    }
    case 'validate': {
      console.log(`Running validation crawls (limit ${limit})...\n`);
      const decisions = await engine.runValidationCrawls(limit);
      printDecisions(decisions);
      break;
    }
    case 'retry': {
      console.log('Retrying READY/PROBED employers due for re-probe...\n');
      const decisions = await engine.retryReadyEmployers();
      printDecisions(decisions);
      break;
    }
    case 'metrics': {
      const metrics = engine.getMetrics();
      console.log('Employer Activation Metrics\n');
      console.log('By state:', metrics.byState);
      console.log(`Avg validation score: ${metrics.avgValidationScore}`);
      console.log(`Avg health score: ${metrics.avgHealthScore}`);
      console.log(`Automatic activations: ${metrics.automaticActivations}`);
      console.log(`Retry queue: ${metrics.retryQueue}`);
      console.log(`Validation queue: ${metrics.validationQueue}`);
      break;
    }
    default:
      console.log('Unknown command. Use: activate | health | validate | retry | metrics');
      process.exit(1);
  }
} finally {
  await scrapeService.shutdown();
  await disconnectPrisma();
}

function printDecisions(
  decisions: Array<{
    companyName: string;
    sourceName: string | null;
    decision: string;
    confidence: number;
    sampleQuality?: number;
    health?: number;
    reason: string;
  }>,
): void {
  if (decisions.length === 0) {
    console.log('No employers processed.');
    return;
  }
  for (const d of decisions) {
    console.log(`${d.companyName} (${d.sourceName ?? '—'})`);
    console.log(`  Decision: ${d.decision}`);
    console.log(`  Confidence: ${d.confidence}`);
    if (d.sampleQuality !== undefined) console.log(`  Sample quality: ${d.sampleQuality}`);
    if (d.health !== undefined) console.log(`  Health: ${d.health}`);
    console.log(`  Reason: ${d.reason}\n`);
  }
  const activated = decisions.filter((d) => d.decision === 'ACTIVATED').length;
  console.log(`Processed: ${decisions.length} | Activated/Monitored: ${activated}`);
}
