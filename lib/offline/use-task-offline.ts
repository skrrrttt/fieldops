'use client';

/**
 * Hook for managing offline task detail data
 * - Syncs individual task and related data to IndexedDB
 * - Reads from cache when offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isIndexedDBAvailable,
  saveToLocal,
  getFromLocal,
  saveAllToLocal,
  getSyncTimestamp,
  type LocalTask,
  type LocalComment,
  type LocalPhoto,
  type LocalFile,
} from './index';
import type { TaskWithRelations } from '../tasks/actions';
import type { PhotoWithUser } from '../photos/actions';
import type { FileWithUser } from '../files/actions';
import type { CommentWithUser } from '../comments/actions';
import type { User } from '../database.types';

export interface UseTaskOfflineOptions {
  // Task ID to fetch
  taskId: string;
  // Server data to sync (passed from server component)
  serverTask: TaskWithRelations | null;
  serverPhotos?: PhotoWithUser[];
  serverFiles?: FileWithUser[];
  serverComments?: CommentWithUser[];
}

export interface UseTaskOfflineResult {
  // Current state
  isOnline: boolean;
  isFromCache: boolean;
  lastSyncedAt: string | null;
  // Data (from cache when offline, from server when online)
  task: TaskWithRelations | null;
  photos: PhotoWithUser[];
  files: FileWithUser[];
  comments: CommentWithUser[];
  // Whether data was found
  notFound: boolean;
}

export function useTaskOffline(options: UseTaskOfflineOptions): UseTaskOfflineResult {
  const {
    taskId,
    serverTask,
    serverPhotos = [],
    serverFiles = [],
    serverComments = [],
  } = options;

  // State
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [task, setTask] = useState<TaskWithRelations | null>(serverTask);
  const [photos, setPhotos] = useState<PhotoWithUser[]>(serverPhotos);
  const [files, setFiles] = useState<FileWithUser[]>(serverFiles);
  const [comments, setComments] = useState<CommentWithUser[]>(serverComments);
  const [notFound, setNotFound] = useState(false);

  // Track if initial sync has happened
  const initialSyncDone = useRef(false);

  // Sync server data to local cache
  const syncToLocalCache = useCallback(async () => {
    if (!isIndexedDBAvailable() || !serverTask) return;

    try {
      // Convert to LocalTask format
      const localTask: LocalTask = {
        ...serverTask,
        status: serverTask.status ?? undefined,
        division: serverTask.division ?? undefined,
        assigned_user: serverTask.assigned_user ? {
          id: serverTask.assigned_user.id,
          email: serverTask.assigned_user.email,
          role: serverTask.assigned_user.role,
          created_at: serverTask.assigned_user.created_at,
          updated_at: serverTask.assigned_user.updated_at,
        } : null,
      };

      // Save task
      await saveToLocal('tasks', localTask);

      // Save related data
      if (serverPhotos.length > 0) {
        const localPhotos: LocalPhoto[] = serverPhotos.map(p => ({
          ...p,
          user: p.user ?? undefined,
        }));
        await saveAllToLocal('photos', localPhotos, false);
      }

      if (serverFiles.length > 0) {
        const localFiles: LocalFile[] = serverFiles.map(f => ({
          ...f,
          user: f.user ?? undefined,
        }));
        await saveAllToLocal('files', localFiles, false);
      }

      if (serverComments.length > 0) {
        const localComments: LocalComment[] = serverComments.map(c => ({
          ...c,
          user: c.user ?? undefined,
        }));
        await saveAllToLocal('comments', localComments, false);
      }

      const now = new Date().toISOString();
      setLastSyncedAt(now);
    } catch (error) {
      console.error('Failed to sync task to local cache:', error);
    }
  }, [serverTask, serverPhotos, serverFiles, serverComments]);

  // Load task from local cache
  const loadFromLocalCache = useCallback(async (): Promise<boolean> => {
    if (!isIndexedDBAvailable()) return false;

    try {
      const cachedTask = await getFromLocal('tasks', taskId) as LocalTask | undefined;

      if (!cachedTask || cachedTask.deleted_at) {
        setNotFound(true);
        return false;
      }

      // Convert to TaskWithRelations format
      // Cast assigned_user as User since we store all required fields
      const taskWithRelations: TaskWithRelations = {
        ...cachedTask,
        status: cachedTask.status ?? null,
        division: cachedTask.division ?? null,
        assigned_user: cachedTask.assigned_user ? cachedTask.assigned_user as User : null,
      };

      setTask(taskWithRelations);

      // Load related data from cache
      const db = await import('./db').then(m => m.getDB());

      const [cachedPhotos, cachedFiles, cachedComments, lastSync] = await Promise.all([
        db.photos.where('task_id').equals(taskId).toArray(),
        db.files.where('task_id').equals(taskId).toArray(),
        db.comments.where('task_id').equals(taskId).toArray(),
        getSyncTimestamp('tasks'),
      ]);

      // Convert to server types
      setPhotos(cachedPhotos.map(p => ({
        ...p,
        user: p.user ?? null,
      })));

      setFiles(cachedFiles.map(f => ({
        ...f,
        user: f.user ?? null,
      })));

      setComments(cachedComments.map(c => ({
        ...c,
        user: c.user ?? null,
      })));

      setIsFromCache(true);
      setLastSyncedAt(lastSync);
      setNotFound(false);

      return true;
    } catch (error) {
      console.error('Failed to load task from local cache:', error);
      return false;
    }
  }, [taskId]);

  // Initial effect: determine data source based on online status
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;

    const initializeData = async () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online && serverTask) {
        // Online with server data: use it and sync to cache
        setTask(serverTask);
        setPhotos(serverPhotos);
        setFiles(serverFiles);
        setComments(serverComments);
        setIsFromCache(false);
        setNotFound(false);
        await syncToLocalCache();
      } else if (!online) {
        // Offline: try to load from cache
        const hasCache = await loadFromLocalCache();
        if (!hasCache) {
          // No cache available
          if (serverTask) {
            // Use server data we got before going offline
            setTask(serverTask);
            setPhotos(serverPhotos);
            setFiles(serverFiles);
            setComments(serverComments);
          } else {
            setNotFound(true);
          }
        }
      } else {
        // Online but no server task (404 case)
        setNotFound(true);
      }
    };

    initializeData();
  }, [serverTask, serverPhotos, serverFiles, serverComments, syncToLocalCache, loadFromLocalCache]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = async () => {
      setIsOnline(false);
      // Try to load from cache when going offline
      await loadFromLocalCache();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadFromLocalCache]);

  return {
    isOnline,
    isFromCache,
    lastSyncedAt,
    task,
    photos,
    files,
    comments,
    notFound,
  };
}
