import { Queue, type ConnectionOptions } from 'bullmq';
import { config, EXTENDED_QUEUE_NAMES, getQueueForCategory, type ScrapeCategory } from '../config/index.js';

const connection: ConnectionOptions = {
  url: config.redisUrl,
  maxRetriesPerRequest: null,
};

const queueCache = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  let queue = queueCache.get(name);
  if (!queue) {
    queue = new Queue(name, { connection });
    queueCache.set(name, queue);
  }
  return queue;
}

export function getCategoryQueue(category: ScrapeCategory): Queue {
  return getQueue(getQueueForCategory(category));
}

export async function enqueueSourceScrape(sourceName: string, category: string): Promise<void> {
  const queue = getCategoryQueue(category as ScrapeCategory);
  await queue.add(
    `scrape-${sourceName}`,
    { category, sourceName },
    {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      jobId: `source-${sourceName}-${Date.now()}`,
    },
  );
}

export async function enqueueLinkedInScrape(): Promise<void> {
  const queue = getQueue(EXTENDED_QUEUE_NAMES.linkedin);
  await queue.add(
    'scrape-linkedin',
    { category: 'linkedin', sourceName: 'linkedin' },
    {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
      jobId: `linkedin-${Date.now()}`,
    },
  );
}

export async function enqueueCategoryScrape(category: ScrapeCategory): Promise<void> {
  const queue = getCategoryQueue(category);
  await queue.add(
    `scrape-${category}`,
    { category },
    {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  );
}

export async function enqueueAllCategories(): Promise<void> {
  const categories = Object.keys(EXTENDED_QUEUE_NAMES) as ScrapeCategory[];
  await Promise.all(categories.map((category) => enqueueCategoryScrape(category)));
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queueCache.values()].map((q) => q.close()));
  queueCache.clear();
}
