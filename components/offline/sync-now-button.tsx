'use client';

/**
 * Sync Now button component
 * Manual trigger for syncing data with server
 */

import { useState, useCallback } from 'react';
import { useOnlineStatus } from '@/lib/offline';

interface SyncNowButtonProps {
  // Called when sync is triggered
  onSync: () => Promise<void>;
  // Is currently syncing
  isSyncing?: boolean;
  // Additional class names
  className?: string;
  // Button variant
  variant?: 'default' | 'icon' | 'header';
}

export function SyncNowButton({
  onSync,
  isSyncing = false,
  className = '',
  variant = 'default',
}: SyncNowButtonProps) {
  const isOnline = useOnlineStatus();
  const [localSyncing, setLocalSyncing] = useState(false);

  const syncing = isSyncing || localSyncing;
  const disabled = syncing || !isOnline;

  const handleClick = useCallback(async () => {
    if (disabled) return;

    setLocalSyncing(true);
    try {
      await onSync();
    } finally {
      setLocalSyncing(false);
    }
  }, [disabled, onSync]);

  // Icon-only variant (for compact headers)
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
          disabled
            ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600'
        } ${className}`}
        title={!isOnline ? 'Offline' : syncing ? 'Syncing...' : 'Sync Now'}
        aria-label={!isOnline ? 'Offline' : syncing ? 'Syncing...' : 'Sync Now'}
      >
        {syncing ? (
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
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </button>
    );
  }

  // Header variant (inline with text)
  if (variant === 'header') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          disabled
            ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
        } ${className}`}
      >
        {syncing ? (
          <>
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
            <span>Syncing...</span>
          </>
        ) : (
          <>
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Sync Now</span>
          </>
        )}
      </button>
    );
  }

  // Default variant (full button)
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
        disabled
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      } ${className}`}
    >
      {syncing ? (
        <>
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
          <span>Syncing...</span>
        </>
      ) : !isOnline ? (
        <>
          <svg
            className="w-5 h-5"
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
          <span>Offline</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Sync Now</span>
        </>
      )}
    </button>
  );
}
