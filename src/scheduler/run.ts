import { startScheduler } from './index.js';
import { logger } from '../lib/logger.js';

startScheduler();
logger.info('Scheduler process running — press Ctrl+C to stop');
