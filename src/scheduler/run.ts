import { startScheduler } from './index.js';
import { startAdaptiveScheduler } from './adaptive-scheduler.js';
import { logger } from '../lib/logger.js';

const useAdaptive = process.env.ADAPTIVE_SCHEDULER !== 'false';

if (useAdaptive) {
  startAdaptiveScheduler();
  logger.info('Adaptive scheduler running (per-source crawl intervals)');
} else {
  startScheduler();
  logger.info('Legacy scheduler running (fixed 6h/daily)');
}

logger.info('Scheduler process running — press Ctrl+C to stop');
