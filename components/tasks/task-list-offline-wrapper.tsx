'use client';

/**
 * Offline-aware wrapper for TaskList
 * Handles syncing server data to IndexedDB and loading from cache when offline
 * Includes pull-to-refresh, sync button, and toast notifications
 */

import { useState, useCallback } from 'react';
import { useOfflineSync, useOnlineStatus, type LocalTask } from '@/lib/offline';
import { refreshTaskList, type TaskWithRelations } from '@/lib/tasks/actions';
import type { Status, Division, User } from '@/lib/database.types';
import { TaskList } from './task-list';
import { OfflineIndicator } from '../offline/offline-indicator';
import { PullToRefresh } from '../offline/pull-to-refresh';
import { SyncNowButton } from '../offline/sync-now-button';
import { SyncToast, useSyncToast } from '../offline/sync-toast';

interface TaskListOfflineWrapperProps {
  // Server-fetched data
  tasks: TaskWithRelations[];
  statuses: Status[];
  divisions: Division[];
}

export function TaskListOfflineWrapper({
  tasks: serverTasks,
  statuses: serverStatuses,
  divisions: serverDivisions,
}: TaskListOfflineWrapperProps) {
  const isOnline = useOnlineStatus();
  const { toast, showSuccess, showError, dismissToast } = useSyncToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local state for refreshed data
  const [currentTasks, setCurrentTasks] = useState<TaskWithRelations[]>(serverTasks);
  const [currentStatuses, setCurrentStatuses] = useState<Status[]>(serverStatuses);
  const [currentDivisions, setCurrentDivisions] = useState<Division[]>(serverDivisions);

  // Convert server tasks to LocalTask format (add denormalized relations)
  const localTasks: LocalTask[] = currentTasks.map(task => ({
    ...task,
    status: task.status ?? undefined,
    division: task.division ?? undefined,
    assigned_user: task.assigned_user ? {
      id: task.assigned_user.id,
      email: task.assigned_user.email,
      role: task.assigned_user.role,
      created_at: task.assigned_user.created_at,
      updated_at: task.assigned_user.updated_at,
    } : null,
  }));

  // Use offline sync hook
  const { tasks, statuses, divisions, isFromCache, state, syncNow } = useOfflineSync({
    serverTasks: localTasks,
    serverStatuses: currentStatuses,
    serverDivisions: currentDivisions,
  });

  // Convert LocalTask back to TaskWithRelations format for TaskList
  // Note: We cast assigned_user as User since we store all required fields
  const tasksWithRelations: TaskWithRelations[] = tasks.map(task => ({
    ...task,
    status: task.status ?? null,
    division: task.division ?? null,
    assigned_user: task.assigned_user ? task.assigned_user as User : null,
    job: null, // Job data is not cached offline
  }));

  // Handle refresh - refetch from server and update cache
  const handleRefresh = useCallback(async () => {
    if (!isOnline) {
      showError('Cannot refresh while offline');
      return;
    }

    setIsRefreshing(true);

    try {
      // Fetch fresh data from server
      const freshData = await refreshTaskList();

      // Update local state with fresh data
      setCurrentTasks(freshData.tasks);
      setCurrentStatuses(freshData.statuses);
      setCurrentDivisions(freshData.divisions);

      // Also sync any pending mutations
      await syncNow();

      showSuccess('Tasks refreshed');
    } catch {
      showError('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, syncNow, showSuccess, showError]);

  // Handle sync button click
  const handleSyncClick = useCallback(async () => {
    if (!isOnline) {
      showError('Cannot sync while offline');
      return;
    }

    setIsRefreshing(true);

    try {
      // Fetch fresh data from server
      const freshData = await refreshTaskList();

      // Update local state with fresh data
      setCurrentTasks(freshData.tasks);
      setCurrentStatuses(freshData.statuses);
      setCurrentDivisions(freshData.divisions);

      // Sync any pending mutations
      await syncNow();

      showSuccess('Synced');
    } catch {
      showError('Sync failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, syncNow, showSuccess, showError]);

  return (
    <>
      {/* Offline indicator banner */}
      <OfflineIndicator
        isFromCache={isFromCache}
        lastSyncedAt={state.lastSyncedAt}
      />

      {/* Compact Sync Row */}
      <div className="mb-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>
          {state.lastSyncedAt && `Synced ${formatRelativeTime(state.lastSyncedAt)}`}
        </span>
        <SyncNowButton
          onSync={handleSyncClick}
          isSyncing={isRefreshing || state.isSyncing}
          variant="header"
        />
      </div>

      {/* Pull-to-refresh wrapper for task list */}
      <PullToRefresh
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || state.isSyncing}
        disabled={!isOnline}
        className="min-h-[200px]"
      >
        <TaskList
          tasks={tasksWithRelations}
          statuses={statuses}
          divisions={divisions}
        />
      </PullToRefresh>

      {/* Toast notifications */}
      <SyncToast message={toast} onDismiss={dismissToast} />
    </>
  );
}

/**
 * Format a timestamp as relative time (e.g., "2 min ago")
 */
function formatRelativeTime(timestamp: string): string {
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
}
