'use client';

/**
 * Sync status indicator component
 * Shows current sync state: Synced, Syncing..., X pending, X conflicts
 */

import { useState } from 'react';
import { useBackgroundSync } from '@/lib/offline/use-background-sync';
import { ConflictModal } from './conflict-resolution';

interface SyncStatusIndicatorProps {
  // Show compact version (icon only)
  compact?: boolean;
  // Show in header style (different layout)
  variant?: 'default' | 'header' | 'badge';
  // Custom class name
  className?: string;
}

export function SyncStatusIndicator({
  compact = false,
  variant = 'default',
  className = '',
}: SyncStatusIndicatorProps) {
  const [showConflictModal, setShowConflictModal] = useState(false);
  const {
    status,
    isSyncing,
    progress,
    summary,
    lastSyncedAt,
    failedCount,
    syncNow,
    retryFailed,
  } = useBackgroundSync();

  const conflictCount = summary.conflict || 0;

  // Format relative time
  const formatRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Get status text
  const getStatusText = (): string => {
    if (isSyncing && progress) {
      return `Syncing... ${progress.current}/${progress.total}`;
    }
    if (isSyncing) {
      return 'Syncing...';
    }
    if (conflictCount > 0) {
      return `${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`;
    }
    if (failedCount > 0) {
      return `${failedCount} failed`;
    }
    if (summary.pending > 0) {
      return `${summary.pending} pending`;
    }
    if (status === 'synced') {
      return 'Synced';
    }
    return '';
  };

  // Get status color
  const getStatusColor = (): string => {
    if (isSyncing) return 'text-blue-600 dark:text-blue-400';
    if (conflictCount > 0) return 'text-amber-600 dark:text-amber-400';
    if (failedCount > 0) return 'text-red-600 dark:text-red-400';
    if (summary.pending > 0) return 'text-amber-600 dark:text-amber-400';
    if (status === 'synced') return 'text-green-600 dark:text-green-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  // Get background color for badge variant
  const getBadgeColor = (): string => {
    if (isSyncing) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
    if (conflictCount > 0) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
    if (failedCount > 0) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
    if (summary.pending > 0) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
    if (status === 'synced') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
  };

  // Don't show if synced and no recent activity
  const shouldShow = isSyncing || conflictCount > 0 || failedCount > 0 || summary.pending > 0 || status === 'synced';

  if (!shouldShow) {
    return null;
  }

  // Badge variant - compact pill
  if (variant === 'badge') {
    const BadgeContent = (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor()} ${className} ${conflictCount > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={conflictCount > 0 ? () => setShowConflictModal(true) : undefined}
      >
        {/* Icon */}
        {isSyncing ? (
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : conflictCount > 0 ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : failedCount > 0 ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : summary.pending > 0 ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}

        {!compact && <span>{getStatusText()}</span>}
      </div>
    );

    return (
      <>
        {BadgeContent}
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
        />
      </>
    );
  }

  // Header variant - inline with actions
  if (variant === 'header') {
    return (
      <>
        <div className={`flex items-center gap-2 text-sm ${className}`}>
          {/* Status indicator */}
          <div className={`flex items-center gap-1.5 ${getStatusColor()}`}>
            {/* Syncing spinner */}
            {isSyncing && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}

            {/* Conflict warning */}
            {conflictCount > 0 && !isSyncing && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}

            {/* Synced checkmark */}
            {status === 'synced' && !isSyncing && summary.pending === 0 && failedCount === 0 && conflictCount === 0 && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}

            {/* Pending clock */}
            {summary.pending > 0 && !isSyncing && conflictCount === 0 && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            {/* Error icon */}
            {failedCount > 0 && !isSyncing && conflictCount === 0 && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            {!compact && <span>{getStatusText()}</span>}
          </div>

          {/* Last synced time */}
          {!compact && lastSyncedAt && status === 'synced' && !isSyncing && conflictCount === 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRelativeTime(lastSyncedAt)}
            </span>
          )}

          {/* Resolve conflicts button */}
          {conflictCount > 0 && (
            <button
              onClick={() => setShowConflictModal(true)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              Resolve
            </button>
          )}

          {/* Retry button */}
          {failedCount > 0 && conflictCount === 0 && (
            <button
              onClick={retryFailed}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retry
            </button>
          )}

          {/* Sync now button */}
          {summary.pending > 0 && !isSyncing && conflictCount === 0 && (
            <button
              onClick={syncNow}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sync now
            </button>
          )}
        </div>
        <ConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
        />
      </>
    );
  }

  // Default variant - full status display
  return (
    <>
      <div className={`flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ${className}`}>
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={`flex-shrink-0 ${getStatusColor()}`}>
            {isSyncing ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : conflictCount > 0 ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : failedCount > 0 ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : summary.pending > 0 ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          {/* Status text */}
          <div>
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {lastSyncedAt && conflictCount === 0 && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Last synced: {formatRelativeTime(lastSyncedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {conflictCount > 0 && (
            <button
              onClick={() => setShowConflictModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
            >
              Resolve
            </button>
          )}
          {failedCount > 0 && conflictCount === 0 && (
            <button
              onClick={retryFailed}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Retry
            </button>
          )}
          {summary.pending > 0 && !isSyncing && conflictCount === 0 && (
            <button
              onClick={syncNow}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Sync Now
            </button>
          )}
        </div>
      </div>
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
      />
    </>
  );
}

/**
 * Simple sync badge for headers/navbars
 */
export function SyncBadge({ className = '' }: { className?: string }) {
  return <SyncStatusIndicator variant="badge" className={className} />;
}

/**
 * Inline sync status for headers
 */
export function SyncStatusHeader({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return <SyncStatusIndicator variant="header" compact={compact} className={className} />;
}
