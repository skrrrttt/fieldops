'use client';

/**
 * Toast notification component for sync operations
 * Shows success/error messages with auto-dismiss
 *
 * This is a fully controlled component - the parent manages the message state
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface SyncToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

interface SyncToastProps {
  message: SyncToastMessage | null;
  onDismiss: () => void;
}

export function SyncToast({ message, onDismiss }: SyncToastProps) {
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Track message changes and set up auto-dismiss timer
  useEffect(() => {
    if (message && message.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = message.id;

      // Clear existing timer
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }

      // Set auto-dismiss timer
      const duration = message.duration ?? 3000;
      dismissTimeoutRef.current = setTimeout(() => {
        onDismiss();
      }, duration);
    } else if (!message) {
      lastMessageIdRef.current = null;
    }

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [message, onDismiss]);

  // Handle manual dismiss
  const handleDismiss = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
    onDismiss();
  }, [onDismiss]);

  // Memoize styles to avoid recalculation
  const { bgColor, icon } = useMemo(() => {
    if (!message) {
      return { bgColor: '', icon: null };
    }

    const colors = {
      success: 'bg-green-600 dark:bg-green-700',
      error: 'bg-red-600 dark:bg-red-700',
      info: 'bg-blue-600 dark:bg-blue-700',
    };

    const icons = {
      success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    return {
      bgColor: colors[message.type],
      icon: icons[message.type],
    };
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 flex justify-center animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm ${bgColor}`}
      >
        {icon}
        <span className="text-sm font-medium">{message.message}</span>
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing sync toast notifications
 * Returns toast state and helper functions
 */
export function useSyncToast() {
  const [toast, setToast] = useState<SyncToastMessage | null>(null);

  const showToast = useCallback((type: SyncToastMessage['type'], messageText: string, duration?: number) => {
    setToast({
      id: Date.now().toString(),
      type,
      message: messageText,
      duration,
    });
  }, []);

  const showSuccess = useCallback((messageText: string) => {
    showToast('success', messageText);
  }, [showToast]);

  const showError = useCallback((messageText: string) => {
    showToast('error', messageText, 5000); // Errors show longer
  }, [showToast]);

  const showInfo = useCallback((messageText: string) => {
    showToast('info', messageText);
  }, [showToast]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showSuccess,
    showError,
    showInfo,
    dismissToast,
  };
}
