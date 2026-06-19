import { config } from '../config/index.js';
import { logger } from './logger.js';

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  const delays = config.retryDelaysMs;
  let lastError: unknown;

  for (let attempt = 0; attempt < config.maxRetryAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === config.maxRetryAttempts - 1;
      logger.warn(
        { err: error, attempt: attempt + 1, maxAttempts: config.maxRetryAttempts, label },
        'Retry attempt failed',
      );
      if (isLast) break;
      await sleep(delays[attempt] ?? delays[delays.length - 1]!);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
