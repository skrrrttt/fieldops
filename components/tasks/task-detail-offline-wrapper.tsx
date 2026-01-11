'use client';

/**
 * Offline-aware wrapper for TaskDetail
 * Handles syncing task data to IndexedDB and loading from cache when offline
 */

import { useTaskOffline } from '@/lib/offline';
import type { TaskWithRelations } from '@/lib/tasks/actions';
import type { PhotoWithUser } from '@/lib/photos/actions';
import type { FileWithUser } from '@/lib/files/actions';
import type { CommentWithUser } from '@/lib/comments/actions';
import type { CustomFieldDefinition } from '@/lib/database.types';
import { TaskDetail } from './task-detail';
import { OfflineIndicator } from '../offline/offline-indicator';

interface TaskDetailOfflineWrapperProps {
  // Task ID
  taskId: string;
  // Server-fetched data
  task: TaskWithRelations | null;
  photos: PhotoWithUser[];
  files: FileWithUser[];
  comments: CommentWithUser[];
  customFields: CustomFieldDefinition[];
}

export function TaskDetailOfflineWrapper({
  taskId,
  task: serverTask,
  photos: serverPhotos,
  files: serverFiles,
  comments: serverComments,
  customFields,
}: TaskDetailOfflineWrapperProps) {
  // Use offline hook for task data
  const {
    task,
    photos,
    files,
    comments,
    isFromCache,
    lastSyncedAt,
    notFound,
  } = useTaskOffline({
    taskId,
    serverTask,
    serverPhotos,
    serverFiles,
    serverComments,
  });

  // Handle not found case
  if (notFound || !task) {
    return (
      <>
        <OfflineIndicator isFromCache={isFromCache} lastSyncedAt={lastSyncedAt} />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
            Task Not Found
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
            {isFromCache
              ? 'This task is not available in your offline cache. Try again when online.'
              : 'The task you are looking for could not be found.'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Offline indicator banner */}
      <OfflineIndicator isFromCache={isFromCache} lastSyncedAt={lastSyncedAt} />

      {/* Task detail */}
      <TaskDetail
        task={task}
        photos={photos}
        files={files}
        comments={comments}
        customFields={customFields}
      />
    </>
  );
}
