'use client';

/**
 * Offline indicator banner component
 * Shows a banner when the app is offline or using cached data
 */

import { useState, useEffect } from 'react';
import { useOnlineStatus, getPendingMutationCount } from '@/lib/offline';

interface OfflineIndicatorProps {
  // Optional: show when using cached data even if online
  isFromCache?: boolean;
  // Optional: last sync timestamp
  lastSyncedAt?: string | null;
}

export function OfflineIndicator({ isFromCache = false, lastSyncedAt }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  // Track pending mutations count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingMutationCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if online and not using cached data and no pending changes
  if (isOnline && !isFromCache && pendingCount === 0) {
    return null;
  }

  // Show pending changes banner when online with pending changes
  const showPendingOnly = isOnline && !isFromCache && pendingCount > 0;

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  return (
    <div
      className={`px-4 py-2 text-sm font-medium text-center ${
        showPendingOnly
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
          : isOnline
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
          : 'bg-zinc-700 dark:bg-zinc-800 text-white'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {/* Icon */}
        {showPendingOnly ? (
          // Pending changes icon (clock)
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : isOnline ? (
          // Cached data icon
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        ) : (
          // Offline icon (cloud with slash)
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-12.728-12.728m12.728 12.728L5.636 5.636"
            />
          </svg>
        )}

        {/* Message */}
        <span>
          {showPendingOnly
            ? `${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`
            : isOnline
            ? 'Viewing cached data'
            : 'You are offline'}
        </span>

        {/* Pending count when offline or cached */}
        {!showPendingOnly && pendingCount > 0 && (
          <>
            <span className="opacity-60">•</span>
            <span className="opacity-80">
              {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
            </span>
          </>
        )}

        {/* Last sync time */}
        {lastSyncedAt && !showPendingOnly && (
          <>
            <span className="opacity-60">•</span>
            <span className="opacity-80">
              Last synced: {formatLastSync(lastSyncedAt)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
