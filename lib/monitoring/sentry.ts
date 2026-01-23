'use client';

/**
 * Sentry helper functions for sync context and metrics
 * Provides context enrichment and metrics tracking for offline sync operations
 */

import * as Sentry from '@sentry/nextjs';
import { getPendingMutationCount } from '@/lib/offline/mutation-queue';
import type { SyncProgress } from '@/lib/offline/sync-processor';

/**
 * Set sync context on Sentry errors
 * Attaches offline status, pending mutation count, and last sync time
 * @param lastSyncTime - ISO timestamp of last successful sync, or null
 */
export async function setSyncContext(lastSyncTime: string | null = null): Promise<void> {
  const pendingMutationCount = await getPendingMutationCount();

  Sentry.setContext('sync', {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingMutationCount,
    lastSyncTime,
  });
}

/**
 * Set Sentry user context for error attribution
 * @param user - User object with id and email
 */
export function setSentryUser(user: { id: string; email: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

/**
 * Clear Sentry user context on logout
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Track sync metrics in Sentry
 * Emits counter metrics for sync success, failure, and conflict counts
 * @param progress - SyncProgress object from sync processor
 */
export function trackSyncMetrics(progress: SyncProgress): void {
  const successCount = progress.current - progress.errors.length - progress.conflicts.length;

  Sentry.metrics.count('sync.success_count', successCount);
  Sentry.metrics.count('sync.failure_count', progress.errors.length);
  Sentry.metrics.count('sync.conflict_count', progress.conflicts.length);
}

/**
 * Set up event listeners for network status changes
 * Updates sync context when online/offline status changes
 * @returns Cleanup function to remove event listeners
 */
export function updateSyncContextOnNetworkChange(): () => void {
  const handleOnline = () => {
    setSyncContext();
  };

  const handleOffline = () => {
    setSyncContext();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}
