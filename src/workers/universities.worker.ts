import { EXTENDED_QUEUE_NAMES } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { createCategoryWorker, shutdownWorkers } from './worker-factory.js';

const worker = createCategoryWorker(EXTENDED_QUEUE_NAMES.universities, 'universities');
logger.info('Universities worker started');

process.on('SIGINT', () => void shutdownWorkers([worker]).then(() => process.exit(0)));
process.on('SIGTERM', () => void shutdownWorkers([worker]).then(() => process.exit(0)));
