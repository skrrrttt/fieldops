'use client';

/**
 * Hook for managing offline data synchronization
 * - Syncs tasks, statuses, divisions to IndexedDB on initial load
 * - Checks IndexedDB first, then fetches updates from server
 * - Tracks online/offline status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isIndexedDBAvailable,
  saveAllToLocal,
  getAllFromLocal,
  getSyncTimestamp,
  type LocalTask,
} from './index';
import type { Status, Division } from '../database.types';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export interface UseOfflineSyncOptions {
  // Server data to sync (passed from server component)
  serverTasks?: LocalTask[];
  serverStatuses?: Status[];
  serverDivisions?: Division[];
  // Enable auto-sync when coming online
  autoSyncOnReconnect?: boolean;
}

export interface UseOfflineSyncResult {
  // Current state
  state: OfflineSyncState;
  // Data (from cache when offline, from server when online)
  tasks: LocalTask[];
  statuses: Status[];
  divisions: Division[];
  // Whether data is from cache
  isFromCache: boolean;
  // Manual sync trigger
  syncNow: () => Promise<void>;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncResult {
  const {
    serverTasks = [],
    serverStatuses = [],
    serverDivisions = [],
    autoSyncOnReconnect = true,
  } = options;

  // State
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  const [tasks, setTasks] = useState<LocalTask[]>(serverTasks);
  const [statuses, setStatuses] = useState<Status[]>(serverStatuses);
  const [divisions, setDivisions] = useState<Division[]>(serverDivisions);
  const [isFromCache, setIsFromCache] = useState(false);

  // Track if initial sync has happened
  const initialSyncDone = useRef(false);

  // Sync server data to local cache
  const syncToLocalCache = useCallback(async () => {
    if (!isIndexedDBAvailable()) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Save all data to IndexedDB
      if (serverTasks.length > 0) {
        await saveAllToLocal('tasks', serverTasks);
      }
      if (serverStatuses.length > 0) {
        await saveAllToLocal('statuses', serverStatuses);
      }
      if (serverDivisions.length > 0) {
        await saveAllToLocal('divisions', serverDivisions);
      }

      const now = new Date().toISOString();
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: now,
      }));
    } catch (error) {
      console.error('Failed to sync to local cache:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Failed to save data locally',
      }));
    }
  }, [serverTasks, serverStatuses, serverDivisions]);

  // Load from local cache
  const loadFromLocalCache = useCallback(async (): Promise<boolean> => {
    if (!isIndexedDBAvailable()) return false;

    try {
      const [cachedTasks, cachedStatuses, cachedDivisions, lastSync] = await Promise.all([
        getAllFromLocal('tasks') as Promise<LocalTask[]>,
        getAllFromLocal('statuses') as Promise<Status[]>,
        getAllFromLocal('divisions') as Promise<Division[]>,
        getSyncTimestamp('tasks'),
      ]);

      // Only use cache if we have data
      if (cachedTasks.length > 0 || cachedStatuses.length > 0 || cachedDivisions.length > 0) {
        // Filter out deleted tasks
        const activeTasks = cachedTasks.filter(t => !t.deleted_at);
        setTasks(activeTasks);
        setStatuses(cachedStatuses);
        setDivisions(cachedDivisions);
        setIsFromCache(true);
        setState(prev => ({
          ...prev,
          lastSyncedAt: lastSync,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to load from local cache:', error);
      return false;
    }
  }, []);

  // Initial effect: determine data source based on online status
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;

    const initializeData = async () => {
      const online = navigator.onLine;
      setState(prev => ({ ...prev, isOnline: online }));

      if (online) {
        // Online: use server data and sync to cache
        setTasks(serverTasks);
        setStatuses(serverStatuses);
        setDivisions(serverDivisions);
        setIsFromCache(false);
        await syncToLocalCache();
      } else {
        // Offline: try to load from cache
        const hasCache = await loadFromLocalCache();
        if (!hasCache) {
          // No cache available, use whatever server data we have (may be empty)
          setTasks(serverTasks);
          setStatuses(serverStatuses);
          setDivisions(serverDivisions);
          setIsFromCache(false);
        }
      }
    };

    initializeData();
  }, [serverTasks, serverStatuses, serverDivisions, syncToLocalCache, loadFromLocalCache]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }));
      if (autoSyncOnReconnect) {
        // When coming back online, we could trigger a refetch
        // For now, just update the state
        setIsFromCache(false);
      }
    };

    const handleOffline = async () => {
      setState(prev => ({ ...prev, isOnline: false }));
      // Try to load from cache when going offline
      await loadFromLocalCache();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSyncOnReconnect, loadFromLocalCache]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, error: 'Cannot sync while offline' }));
      return;
    }

    await syncToLocalCache();
  }, [state.isOnline, syncToLocalCache]);

  return {
    state,
    tasks,
    statuses,
    divisions,
    isFromCache,
    syncNow,
  };
}

/**
 * Simple hook for tracking online/offline status only
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
