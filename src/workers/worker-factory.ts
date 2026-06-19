import { Worker, type ConnectionOptions, type Job } from 'bullmq';
import { config, type ScrapeCategory } from '../config/index.js';
import { createContainer } from '../container.js';
import { disconnectPrisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const connection: ConnectionOptions = {
  url: config.redisUrl,
  maxRetriesPerRequest: null,
};

export interface ScrapeJobData {
  category: ScrapeCategory;
}

export function createCategoryWorker(queueName: string, category: ScrapeCategory): Worker {
  const container = createContainer();

  const worker = new Worker<ScrapeJobData>(
    queueName,
    async (job: Job<ScrapeJobData>) => {
      logger.info({ queue: queueName, category, jobId: job.id }, 'Worker processing job');
      const stats = await container.scrapeService.scrapeCategory(category);
      return {
        processed: stats.length,
        success: stats.filter((s) => s.status === 'success').length,
        failed: stats.filter((s) => s.status === 'failed').length,
      };
    },
    { connection, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, queue: queueName, jobId: job?.id }, 'Worker job failed');
  });

  worker.on('completed', (job, result) => {
    logger.info({ queue: queueName, jobId: job.id, result }, 'Worker job completed');
  });

  return worker;
}

export async function shutdownWorkers(workers: Worker[]): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  const container = createContainer();
  await container.scrapeService.shutdown();
  await disconnectPrisma();
}
