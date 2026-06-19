import { EXTENDED_QUEUE_NAMES } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { createCategoryWorker, shutdownWorkers } from './worker-factory.js';

const workers = [
  createCategoryWorker(EXTENDED_QUEUE_NAMES.banks, 'banks'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.telecom, 'telecom'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.automotive, 'automotive'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.retail, 'retail'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.government, 'government'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.universities, 'universities'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.airlines, 'airlines'),
  createCategoryWorker(EXTENDED_QUEUE_NAMES.technology, 'technology'),
];

logger.info({ queues: workers.length }, 'All scrape workers started');

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down workers');
  await shutdownWorkers(workers);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
