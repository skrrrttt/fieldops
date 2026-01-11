'use client';

import { useState, useEffect, useRef } from 'react';
import { getPendingMutationCount, getMutationsSummary, type MutationsSummary } from '@/lib/offline';

interface PendingChangesIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * Displays the count of pending changes waiting to be synced
 */
export function PendingChangesIndicator({
  showDetails = false,
  className = '',
}: PendingChangesIndicatorProps) {
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState<MutationsSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const isMountedRef = useRef(true);

  // Update count on mount and periodically
  useEffect(() => {
    isMountedRef.current = true;

    const fetchCount = async () => {
      const pendingCount = await getPendingMutationCount();
      if (isMountedRef.current) {
        setCount(pendingCount);
      }

      if (showDetails) {
        const fullSummary = await getMutationsSummary();
        if (isMountedRef.current) {
          setSummary(fullSummary);
        }
      }
    };

    fetchCount();

    // Poll every 5 seconds to catch updates
    const interval = setInterval(fetchCount, 5000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [showDetails]);

  // Don't render if no pending changes
  if (count === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
      >
        {/* Clock icon */}
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
        <span>{count} pending change{count !== 1 ? 's' : ''}</span>
        {showDetails && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Expanded details */}
      {showDetails && isExpanded && summary && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[200px] z-50">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Pending Changes
          </h4>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {summary.byType.status > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {summary.byType.status} status update{summary.byType.status !== 1 ? 's' : ''}
              </li>
            )}
            {summary.byType.comment > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {summary.byType.comment} comment{summary.byType.comment !== 1 ? 's' : ''}
              </li>
            )}
            {summary.byType.photo > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                {summary.byType.photo} photo{summary.byType.photo !== 1 ? 's' : ''}
              </li>
            )}
            {summary.byType.file > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {summary.byType.file} file{summary.byType.file !== 1 ? 's' : ''}
              </li>
            )}
          </ul>
          {summary.failed > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-red-600 dark:text-red-400">
                {summary.failed} failed (will retry)
              </p>
            </div>
          )}
          <p className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
            Changes will sync when online
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Simple badge version for compact display
 */
export function PendingChangesBadge({ className = '' }: { className?: string }) {
  const [count, setCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchCount = async () => {
      const pendingCount = await getPendingMutationCount();
      if (isMountedRef.current) {
        setCount(pendingCount);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full ${className}`}
    >
      {count}
    </span>
  );
}
