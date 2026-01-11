'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Status } from '@/lib/database.types';
import { updateTaskStatus } from '@/lib/tasks/actions';
import { useOnlineStatus, queueStatusMutation, saveToLocal, getFromLocal } from '@/lib/offline';
import { trackMeaningfulAction } from '@/components/pwa/pwa-install-prompt';

interface StatusUpdateUIProps {
  taskId: string;
  currentStatusId: string;
  statuses: Status[];
}

export function StatusUpdateUI({
  taskId,
  currentStatusId,
  statuses,
}: StatusUpdateUIProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [selectedStatusId, setSelectedStatusId] = useState(currentStatusId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const handleStatusSelect = async (statusId: string) => {
    if (statusId === selectedStatusId || isUpdating) return;

    // Optimistic update
    const previousStatusId = selectedStatusId;
    setSelectedStatusId(statusId);
    setIsUpdating(true);

    // If offline, queue the mutation
    if (!isOnline) {
      try {
        // Queue the mutation for later sync
        await queueStatusMutation({
          task_id: taskId,
          status_id: statusId,
          previous_status_id: previousStatusId,
        });

        // Update local cache optimistically
        const localTask = await getFromLocal('tasks', taskId);
        if (localTask) {
          const newStatus = statuses.find((s) => s.id === statusId);
          await saveToLocal('tasks', {
            ...localTask,
            status_id: statusId,
            status: newStatus,
            updated_at: new Date().toISOString(),
          });
        }

        const newStatus = statuses.find((s) => s.id === statusId);
        showToast(
          `Status queued: "${newStatus?.name || 'new status'}" (will sync when online)`,
          'info'
        );

        // Navigate back after a short delay to show the toast
        setTimeout(() => {
          router.push(`/tasks/${taskId}`);
          router.refresh();
        }, 1000);
      } catch {
        // Revert on error
        setSelectedStatusId(previousStatusId);
        showToast('Failed to queue status update', 'error');
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // Online: send to server immediately
    try {
      const result = await updateTaskStatus(taskId, statusId);

      if (result.success) {
        // Track meaningful action for PWA install prompt
        trackMeaningfulAction();

        const newStatus = statuses.find((s) => s.id === statusId);
        showToast(
          `Status updated to "${newStatus?.name || 'new status'}"`,
          'success'
        );
        // Navigate back after a short delay to show the toast
        setTimeout(() => {
          router.push(`/tasks/${taskId}`);
          router.refresh();
        }, 1000);
      } else {
        // Revert on error
        setSelectedStatusId(previousStatusId);
        showToast(result.error || 'Failed to update status', 'error');
      }
    } catch {
      // Revert on error
      setSelectedStatusId(previousStatusId);
      showToast('Failed to update status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate contrast color for text
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Tap a status below to update this task. The current status is
          highlighted.
        </p>
      </div>

      {/* Status Buttons */}
      <div className="space-y-3">
        {statuses.map((status) => {
          const isSelected = status.id === selectedStatusId;
          const textColor = getContrastColor(status.color);

          return (
            <button
              key={status.id}
              onClick={() => handleStatusSelect(status.id)}
              disabled={isUpdating}
              className={`
                relative w-full min-h-[64px] px-6 py-4 rounded-lg font-semibold text-lg
                transition-all duration-200
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'ring-4 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900 scale-[1.02]'
                    : 'hover:scale-[1.01] hover:shadow-md'
                }
              `}
              style={{
                backgroundColor: status.color,
                color: textColor,
              }}
            >
              <span className="flex items-center justify-center gap-3">
                {/* Check icon for selected status */}
                {isSelected && (
                  <svg
                    className="w-6 h-6 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                <span>{status.name}</span>
                {/* Complete badge */}
                {status.is_complete && (
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: `${textColor}20`,
                      color: textColor,
                    }}
                  >
                    Complete
                  </span>
                )}
              </span>

              {/* Loading indicator overlay */}
              {isUpdating && isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                  <svg
                    className="animate-spin h-6 w-6"
                    style={{ color: textColor }}
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
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`
            fixed bottom-6 left-4 right-4 max-w-md mx-auto
            px-4 py-3 rounded-lg shadow-lg
            flex items-center gap-3
            animate-slide-up
            ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-red-600 text-white'
            }
          `}
        >
          {toast.type === 'success' ? (
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : toast.type === 'info' ? (
            <svg
              className="w-5 h-5 flex-shrink-0"
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
          ) : (
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Custom animation style */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
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
