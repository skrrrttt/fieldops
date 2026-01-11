'use client';

/**
 * Hook for managing background sync of offline mutations
 * - Automatically processes queued mutations when online
 * - Listens for service worker sync events
 * - Provides sync status and progress
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './use-offline-sync';
import {
  processAllMutations,
  registerBackgroundSync,
  isBackgroundSyncAvailable,
  type SyncProgress,
  type SyncStatus,
} from './sync-processor';
import { getPendingMutationCount, getMutationsSummary, type MutationsSummary } from './mutation-queue';

export interface UseBackgroundSyncResult {
  // Current sync status
  status: SyncStatus;
  // Is currently syncing
  isSyncing: boolean;
  // Progress info during sync
  progress: SyncProgress | null;
  // Summary of mutations in queue
  summary: MutationsSummary;
  // Last sync timestamp
  lastSyncedAt: string | null;
  // Number of failed mutations
  failedCount: number;
  // Trigger manual sync
  syncNow: () => Promise<void>;
  // Retry failed mutations
  retryFailed: () => Promise<void>;
}

export function useBackgroundSync(): UseBackgroundSyncResult {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<MutationsSummary>({
    total: 0,
    pending: 0,
    syncing: 0,
    failed: 0,
    conflict: 0,
    byType: { status: 0, comment: 0, photo: 0, file: 0 },
  });

  // Prevent multiple sync operations
  const isSyncingRef = useRef(false);
  // Track if auto-sync has been triggered
  const autoSyncTriggeredRef = useRef(false);

  // Update summary
  const updateSummary = useCallback(async () => {
    const newSummary = await getMutationsSummary();
    setSummary(newSummary);

    // Update status based on summary
    if (newSummary.syncing > 0) {
      setStatus('syncing');
    } else if (newSummary.failed > 0 && newSummary.pending === 0) {
      setStatus('error');
    } else if (newSummary.total === 0) {
      setStatus('synced');
    } else {
      setStatus('idle');
    }
  }, []);

  // Process all pending mutations
  const processMutations = useCallback(async () => {
    if (isSyncingRef.current) return;

    const pendingCount = await getPendingMutationCount();
    if (pendingCount === 0) {
      setStatus('synced');
      setLastSyncedAt(new Date().toISOString());
      return;
    }

    isSyncingRef.current = true;
    setStatus('syncing');

    try {
      const result = await processAllMutations((p) => {
        setProgress(p);
      });

      setStatus(result.status);
      setLastSyncedAt(result.lastSyncedAt);
      setProgress(null);
      await updateSummary();
    } catch (error) {
      console.error('Error processing mutations:', error);
      setStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [updateSummary]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }

    // Try background sync first if available
    if (isBackgroundSyncAvailable()) {
      await registerBackgroundSync();
    }

    // Always do immediate processing as well
    await processMutations();
  }, [isOnline, processMutations]);

  // Retry failed mutations
  const retryFailed = useCallback(async () => {
    const { resetFailedMutations } = await import('./mutation-queue');
    await resetFailedMutations();
    await updateSummary();
    await syncNow();
  }, [syncNow, updateSummary]);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_MUTATIONS') {
        console.log('[BackgroundSync] Received sync request from service worker');
        processMutations();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [processMutations]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && !autoSyncTriggeredRef.current) {
      // Check if there are pending mutations
      getPendingMutationCount().then((count) => {
        if (count > 0) {
          console.log('[BackgroundSync] Online with pending mutations, triggering sync');
          autoSyncTriggeredRef.current = true;
          syncNow().finally(() => {
            // Reset after a delay to allow re-triggering
            setTimeout(() => {
              autoSyncTriggeredRef.current = false;
            }, 5000);
          });
        }
      });
    }
  }, [isOnline, syncNow]);

  // Poll for summary updates
  useEffect(() => {
    updateSummary();
    const interval = setInterval(updateSummary, 3000);
    return () => clearInterval(interval);
  }, [updateSummary]);

  // Register background sync on mount
  useEffect(() => {
    if (isBackgroundSyncAvailable()) {
      registerBackgroundSync();
    }
  }, []);

  return {
    status,
    isSyncing: status === 'syncing',
    progress,
    summary,
    lastSyncedAt,
    failedCount: summary.failed,
    syncNow,
    retryFailed,
  };
}
