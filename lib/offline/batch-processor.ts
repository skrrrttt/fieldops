/**
 * Batch processor for parallel mutation processing with concurrency control
 * Uses p-limit for concurrency limiting and Promise.allSettled for independent failure handling
 */

import pLimit from 'p-limit';
import { calculateBackoff, isRateLimitError, delay } from './backoff';
import type { TypedPendingMutation } from './db';
import type { SyncResult } from './sync-processor';

// Concurrency limits by mutation type
export const DATA_CONCURRENCY = 5;  // Status, comment mutations
export const FILE_CONCURRENCY = 2;  // Photo, file mutations (larger payloads)

// Rate limit retry configuration
export const MAX_RATE_LIMIT_RETRIES = 5;

export interface BatchResult {
  results: SyncResult[];
  rateLimitHit: boolean;
  rateLimitRetries: number;
}

/**
 * Process a batch of mutations with concurrency control
 * Uses Promise.allSettled for independent failure handling - one failure doesn't abort others
 */
export async function processBatch(
  mutations: TypedPendingMutation[],
  processMutation: (mutation: TypedPendingMutation) => Promise<SyncResult>,
  concurrency: number
): Promise<SyncResult[]> {
  const limit = pLimit(concurrency);

  const tasks = mutations.map(mutation =>
    limit(() => processMutation(mutation))
  );

  const results = await Promise.allSettled(tasks);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // Rejected promise - convert to error result
    return {
      success: false,
      mutationId: mutations[index].id,
      error: result.reason?.message || 'Unknown error during batch processing',
    };
  });
}

/**
 * Process mutations in batches with rate limit handling
 * Separates data mutations (status, comment) from file mutations (photo, file)
 * Applies different concurrency limits and handles 429 errors with backoff
 */
export async function processBatchWithRateLimit(
  mutations: TypedPendingMutation[],
  processMutation: (mutation: TypedPendingMutation) => Promise<SyncResult>,
  onRateLimitWait?: (retryNumber: number, delayMs: number) => void
): Promise<BatchResult> {
  // Separate mutations by type for different concurrency limits
  const dataMutations = mutations.filter(m => m.type === 'status' || m.type === 'comment');
  const fileMutations = mutations.filter(m => m.type === 'photo' || m.type === 'file');

  let totalRateLimitRetries = 0;
  let rateLimitHit = false;
  const allResults: SyncResult[] = [];

  // Process with rate limit retry wrapper
  const processWithRetry = async (
    batch: TypedPendingMutation[],
    concurrency: number
  ): Promise<SyncResult[]> => {
    if (batch.length === 0) return [];

    let currentBatch = batch;
    let retryCount = 0;

    while (retryCount < MAX_RATE_LIMIT_RETRIES) {
      const results = await processBatch(currentBatch, processMutation, concurrency);

      // Check if any result indicates a rate limit error
      const rateLimitResult = results.find(r => !r.success && r.error && isRateLimitError({ message: r.error }));

      if (!rateLimitResult) {
        return results;
      }

      // Rate limit hit - backoff and retry
      rateLimitHit = true;
      retryCount++;
      totalRateLimitRetries++;

      if (retryCount >= MAX_RATE_LIMIT_RETRIES) {
        // Max retries exceeded - return results as-is
        return results;
      }

      const backoffDelay = calculateBackoff(retryCount);
      onRateLimitWait?.(retryCount, backoffDelay);
      await delay(backoffDelay);

      // Filter out successful results, retry only failed ones
      const failedMutationIds = new Set(
        results.filter(r => !r.success).map(r => r.mutationId)
      );
      const successfulResults = results.filter(r => r.success);
      allResults.push(...successfulResults);

      currentBatch = currentBatch.filter(m => failedMutationIds.has(m.id));
    }

    // Should not reach here, but return empty if it does
    return [];
  };

  // Process data mutations first (faster, smaller payloads)
  const dataResults = await processWithRetry(dataMutations, DATA_CONCURRENCY);
  allResults.push(...dataResults);

  // Then file mutations (slower, larger payloads, stricter rate limits)
  const fileResults = await processWithRetry(fileMutations, FILE_CONCURRENCY);
  allResults.push(...fileResults);

  return {
    results: allResults,
    rateLimitHit,
    rateLimitRetries: totalRateLimitRetries,
  };
}
