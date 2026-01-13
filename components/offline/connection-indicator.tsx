'use client';

/**
 * ConnectionIndicator - Compact connection status indicator for header
 * Shows a small dot/icon indicating online/offline/syncing status
 */

import { useOnlineStatus } from '@/lib/offline';
import { useBackgroundSync } from '@/lib/offline/use-background-sync';

export function ConnectionIndicator() {
  const isOnline = useOnlineStatus();
  const { isSyncing, summary, status } = useBackgroundSync();

  const pendingCount = summary.pending || 0;
  const hasIssues = summary.conflict > 0 || summary.failed > 0;

  // Determine status color and icon
  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: 'bg-zinc-400 dark:bg-zinc-500',
        ringColor: 'ring-zinc-400/30',
        icon: 'offline',
        label: 'Offline',
      };
    }
    if (isSyncing) {
      return {
        color: 'bg-blue-500',
        ringColor: 'ring-blue-500/30',
        icon: 'syncing',
        label: 'Syncing...',
      };
    }
    if (hasIssues) {
      return {
        color: 'bg-amber-500',
        ringColor: 'ring-amber-500/30',
        icon: 'warning',
        label: 'Sync issues',
      };
    }
    if (pendingCount > 0) {
      return {
        color: 'bg-amber-500',
        ringColor: 'ring-amber-500/30',
        icon: 'pending',
        label: `${pendingCount} pending`,
      };
    }
    // Connected and synced
    return {
      color: 'bg-green-500',
      ringColor: 'ring-green-500/30',
      icon: 'connected',
      label: 'Connected',
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className="relative flex items-center gap-2 cursor-default"
      title={config.label}
      aria-label={config.label}
    >
      {/* Status dot with pulse effect when syncing */}
      <div className="relative">
        <span
          className={`block w-2.5 h-2.5 rounded-full ${config.color} ${
            isSyncing ? 'animate-pulse' : ''
          }`}
        />
        {/* Outer ring for emphasis */}
        {(isSyncing || !isOnline || hasIssues) && (
          <span
            className={`absolute inset-0 w-2.5 h-2.5 rounded-full ring-2 ${config.ringColor} ${
              isSyncing ? 'animate-ping' : ''
            }`}
          />
        )}
      </div>

      {/* Show count badge if there are pending changes */}
      {pendingCount > 0 && isOnline && !isSyncing && (
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
