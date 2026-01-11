'use client';

/**
 * Hook for manual data refresh and pull-to-refresh
 * - Fetches latest tasks, statuses, divisions from server
 * - Updates local IndexedDB cache
 * - Provides loading state and callbacks for UI feedback
 */

import { useState, useCallback, useRef } from 'react';
import { useOnlineStatus } from './use-offline-sync';
import {
  isIndexedDBAvailable,
  saveAllToLocal,
  updateSyncTimestamp,
} from './index';
import type { LocalTask } from './db';
import type { Status, Division } from '../database.types';

export interface RefreshResult {
  success: boolean;
  error?: string;
  tasksCount?: number;
  statusesCount?: number;
  divisionsCount?: number;
}

export interface UseManualRefreshOptions {
  // Callback to get fresh data from server
  onRefresh?: () => Promise<{
    tasks: LocalTask[];
    statuses: Status[];
    divisions: Division[];
  }>;
  // Called when refresh succeeds
  onSuccess?: (result: RefreshResult) => void;
  // Called when refresh fails
  onError?: (error: string) => void;
}

export interface UseManualRefreshResult {
  // Is currently refreshing
  isRefreshing: boolean;
  // Last refresh timestamp
  lastRefreshAt: string | null;
  // Trigger refresh
  refresh: () => Promise<RefreshResult>;
  // For pull-to-refresh: touch start handler
  onTouchStart: (e: React.TouchEvent) => void;
  // For pull-to-refresh: touch move handler
  onTouchMove: (e: React.TouchEvent) => void;
  // For pull-to-refresh: touch end handler
  onTouchEnd: () => void;
  // Pull-to-refresh pull distance (0-1 for progress)
  pullProgress: number;
  // Is pull active
  isPulling: boolean;
}

// Minimum pull distance to trigger refresh (in pixels)
const PULL_THRESHOLD = 80;
// Maximum pull distance (beyond this, no additional effect)
const MAX_PULL = 120;

export function useManualRefresh(options: UseManualRefreshOptions = {}): UseManualRefreshResult {
  const { onRefresh, onSuccess, onError } = options;
  const isOnline = useOnlineStatus();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Touch tracking refs
  const touchStartY = useRef<number | null>(null);
  const scrollTop = useRef<number>(0);
  const isAtTop = useRef(false);

  // Main refresh function
  const refresh = useCallback(async (): Promise<RefreshResult> => {
    if (isRefreshing) {
      return { success: false, error: 'Already refreshing' };
    }

    if (!isOnline) {
      const error = 'Cannot refresh while offline';
      onError?.(error);
      return { success: false, error };
    }

    if (!onRefresh) {
      const error = 'No refresh callback provided';
      onError?.(error);
      return { success: false, error };
    }

    setIsRefreshing(true);

    try {
      // Fetch fresh data from server
      const { tasks, statuses, divisions } = await onRefresh();

      // Save to IndexedDB
      if (isIndexedDBAvailable()) {
        await saveAllToLocal('tasks', tasks);
        await saveAllToLocal('statuses', statuses);
        await saveAllToLocal('divisions', divisions);

        // Update sync timestamps
        const now = new Date().toISOString();
        await updateSyncTimestamp('tasks', now);
        await updateSyncTimestamp('statuses', now);
        await updateSyncTimestamp('divisions', now);
      }

      const now = new Date().toISOString();
      setLastRefreshAt(now);

      const result: RefreshResult = {
        success: true,
        tasksCount: tasks.length,
        statusesCount: statuses.length,
        divisionsCount: divisions.length,
      };

      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, isOnline, onRefresh, onSuccess, onError]);

  // Pull-to-refresh touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Get the touch position
    touchStartY.current = e.touches[0].clientY;

    // Check if we're at the top of the scroll container
    const target = e.currentTarget as HTMLElement;
    scrollTop.current = target.scrollTop;
    isAtTop.current = scrollTop.current <= 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current || !isAtTop.current || isRefreshing) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Only handle downward pull when at top
    if (diff > 0) {
      setIsPulling(true);
      // Calculate progress with easing (diminishing returns as you pull further)
      const rawProgress = Math.min(diff / MAX_PULL, 1);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 2);
      setPullProgress(easedProgress);
    } else {
      setIsPulling(false);
      setPullProgress(0);
    }
  }, [isRefreshing]);

  const onTouchEnd = useCallback(() => {
    if (isPulling && !isRefreshing) {
      // Check if pulled far enough to trigger refresh
      if (pullProgress >= PULL_THRESHOLD / MAX_PULL) {
        refresh();
      }
    }

    // Reset pull state
    touchStartY.current = null;
    setIsPulling(false);
    setPullProgress(0);
  }, [isPulling, isRefreshing, pullProgress, refresh]);

  return {
    isRefreshing,
    lastRefreshAt,
    refresh,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    pullProgress,
    isPulling,
  };
}
