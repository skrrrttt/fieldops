'use client';

/**
 * Sync processor for offline mutations
 * Processes queued mutations in FIFO order when online
 */

import { createClient } from '@/lib/supabase/client';
import { trackSyncMetrics, setSyncContext } from '@/lib/monitoring/sentry';
import {
  getPendingMutations,
  updateMutationStatus,
  deleteMutation,
  markMutationConflict,
  recoverStuckMutations,
} from './mutation-queue';
import { processBatchWithRateLimit } from './batch-processor';
import {
  type TypedPendingMutation,
  type PendingStatusMutation,
  type PendingCommentMutation,
  type PendingPhotoMutation,
  type PendingFileMutation,
  type PendingSegmentCompleteMutation,
  type LocalTask,
  type LocalComment,
  type LocalPhoto,
  type LocalFile,
  type ConflictInfo,
} from './db';
import { saveToLocal, getFromLocal, deleteFromLocal } from './helpers';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncResult {
  success: boolean;
  mutationId: string;
  error?: string;
  conflict?: ConflictInfo;
}

export interface SyncProgress {
  status: SyncStatus;
  current: number;
  total: number;
  lastSyncedAt: string | null;
  errors: SyncResult[];
  conflicts: SyncResult[];
}

/**
 * Process a status mutation - update task status in Supabase
 * Detects conflicts when server has been updated since mutation was created
 */
async function processStatusMutation(
  mutation: PendingStatusMutation
): Promise<SyncResult> {
  const supabase = createClient();
  const { task_id, status_id, previous_status_id } = mutation.payload;

  try {
    // First, fetch current server state to check for conflicts
    const { data: serverTask, error: fetchError } = await supabase
      .from('tasks')
      .select('status_id, updated_at')
      .eq('id', task_id)
      .single<{ status_id: string; updated_at: string }>();

    if (fetchError) {
      return { success: false, mutationId: mutation.id, error: fetchError.message };
    }

    if (!serverTask) {
      return { success: false, mutationId: mutation.id, error: 'Task not found' };
    }

    // Check for conflict: server was updated after mutation was created
    // AND the server value differs from what we expected (previous_status_id)
    const serverUpdatedAt = new Date(serverTask.updated_at);
    const mutationCreatedAt = new Date(mutation.created_at);
    const hasServerChanged = serverTask.status_id !== previous_status_id;
    const isServerNewer = serverUpdatedAt > mutationCreatedAt;

    if (hasServerChanged && isServerNewer && !mutation.force_overwrite) {
      // Conflict detected - server has different value than expected
      const conflict: ConflictInfo = {
        detected_at: new Date().toISOString(),
        local_value: status_id,
        server_value: serverTask.status_id,
        server_updated_at: serverTask.updated_at,
        field_name: 'status',
      };

      return {
        success: false,
        mutationId: mutation.id,
        conflict,
      };
    }

    // No conflict or force_overwrite - proceed with update
    const { error } = await supabase
      .from('tasks')
      .update({
        status_id: status_id,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', task_id);

    if (error) {
      return { success: false, mutationId: mutation.id, error: error.message };
    }

    // Update local cache with new status
    const localTask = await getFromLocal('tasks', task_id);
    if (localTask) {
      await saveToLocal('tasks', { ...(localTask as LocalTask), status_id });
    }

    return { success: true, mutationId: mutation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, mutationId: mutation.id, error: message };
  }
}

/**
 * Process a comment mutation - create comment in Supabase
 */
async function processCommentMutation(
  mutation: PendingCommentMutation
): Promise<SyncResult> {
  const supabase = createClient();
  const { task_id, content, temp_id } = mutation.payload;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, mutationId: mutation.id, error: 'Not authenticated' };
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        task_id,
        user_id: user.id,
        content: content.trim(),
      } as never)
      .select(`
        *,
        user:users(id, email)
      `)
      .single();

    if (error) {
      return { success: false, mutationId: mutation.id, error: error.message };
    }

    // Update local cache - replace temp comment with real one
    const localComment = await getFromLocal('comments', temp_id);
    if (localComment) {
      // Delete temp comment
      await deleteFromLocal('comments', temp_id);
    }
    // Save real comment
    if (comment) {
      await saveToLocal('comments', comment as LocalComment);
    }

    return { success: true, mutationId: mutation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, mutationId: mutation.id, error: message };
  }
}

/**
 * Process a photo mutation - upload photo to Supabase Storage and create record
 */
async function processPhotoMutation(
  mutation: PendingPhotoMutation
): Promise<SyncResult> {
  const supabase = createClient();
  const { task_id, blob, timestamp, gps_lat, gps_lng, temp_id } = mutation.payload;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, mutationId: mutation.id, error: 'Not authenticated' };
    }

    // Generate unique filename
    const filename = `${task_id}/${Date.now()}_${Math.random().toString(36).substring(2, 11)}.jpg`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      return { success: false, mutationId: mutation.id, error: uploadError.message };
    }

    // Create photo record
    const { data: photo, error: recordError } = await supabase
      .from('photos')
      .insert({
        task_id,
        user_id: user.id,
        storage_path: filename,
        timestamp,
        gps_lat: gps_lat || null,
        gps_lng: gps_lng || null,
      } as never)
      .select(`
        *,
        user:users(id, email)
      `)
      .single();

    if (recordError) {
      // Try to clean up uploaded file
      await supabase.storage.from('photos').remove([filename]);
      return { success: false, mutationId: mutation.id, error: recordError.message };
    }

    // Update local cache - replace temp photo with real one
    const localPhoto = await getFromLocal('photos', temp_id);
    if (localPhoto) {
      await deleteFromLocal('photos', temp_id);
    }
    // Save real photo (without local blob)
    if (photo) {
      await saveToLocal('photos', photo as LocalPhoto);
    }

    return { success: true, mutationId: mutation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, mutationId: mutation.id, error: message };
  }
}

/**
 * Process a file mutation - upload file to Supabase Storage and create record
 */
async function processFileMutation(
  mutation: PendingFileMutation
): Promise<SyncResult> {
  const supabase = createClient();
  const { task_id, blob, file_name, file_size, temp_id } = mutation.payload;

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, mutationId: mutation.id, error: 'Not authenticated' };
    }

    // Generate unique filename
    const ext = file_name.split('.').pop() || '';
    const baseName = file_name.replace(/\.[^/.]+$/, '');
    const filename = `${task_id}/${Date.now()}_${baseName}.${ext}`;

    // Determine content type
    const contentType = blob.type || 'application/octet-stream';

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filename, blob, {
        contentType,
        cacheControl: '3600',
      });

    if (uploadError) {
      return { success: false, mutationId: mutation.id, error: uploadError.message };
    }

    // Create file record
    const { data: file, error: recordError } = await supabase
      .from('files')
      .insert({
        task_id,
        user_id: user.id,
        storage_path: filename,
        file_name,
        file_size,
      } as never)
      .select(`
        *,
        user:users(id, email)
      `)
      .single();

    if (recordError) {
      // Try to clean up uploaded file
      await supabase.storage.from('files').remove([filename]);
      return { success: false, mutationId: mutation.id, error: recordError.message };
    }

    // Update local cache - replace temp file with real one
    const localFile = await getFromLocal('files', temp_id);
    if (localFile) {
      await deleteFromLocal('files', temp_id);
    }
    // Save real file (without local blob)
    if (file) {
      await saveToLocal('files', file as LocalFile);
    }

    return { success: true, mutationId: mutation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, mutationId: mutation.id, error: message };
  }
}

/**
 * Process a segment complete mutation - toggle segment completion in Supabase
 */
async function processSegmentCompleteMutation(
  mutation: PendingSegmentCompleteMutation
): Promise<SyncResult> {
  const supabase = createClient();
  const { assignment_id, is_complete } = mutation.payload;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, mutationId: mutation.id, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('task_segment_assignments')
      .update({
        is_complete,
        completed_at: is_complete ? new Date().toISOString() : null,
        completed_by: is_complete ? user.id : null,
      } as never)
      .eq('id', assignment_id);

    if (error) {
      return { success: false, mutationId: mutation.id, error: error.message };
    }

    return { success: true, mutationId: mutation.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, mutationId: mutation.id, error: message };
  }
}

/**
 * Process a single mutation based on its type
 */
async function processMutation(mutation: TypedPendingMutation): Promise<SyncResult> {
  switch (mutation.type) {
    case 'status':
      return processStatusMutation(mutation);
    case 'comment':
      return processCommentMutation(mutation);
    case 'photo':
      return processPhotoMutation(mutation);
    case 'file':
      return processFileMutation(mutation);
    case 'segment_complete':
      return processSegmentCompleteMutation(mutation);
  }
}

/**
 * Process all pending mutations in parallel batches
 * Data mutations (status, comment) use concurrency of 5
 * File mutations (photo, file) use concurrency of 2
 * Returns progress callback for UI updates
 */
export async function processAllMutations(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  // Recover any mutations stuck in 'syncing' state from a previous interrupted sync
  await recoverStuckMutations();

  const mutations = await getPendingMutations();

  const progress: SyncProgress = {
    status: 'syncing',
    current: 0,
    total: mutations.length,
    lastSyncedAt: null,
    errors: [],
    conflicts: [],
  };

  if (mutations.length === 0) {
    progress.status = 'synced';
    progress.lastSyncedAt = new Date().toISOString();
    onProgress?.(progress);
    return progress;
  }

  onProgress?.(progress);

  // Mark all mutations as syncing before batch processing
  await Promise.all(mutations.map(m => updateMutationStatus(m.id, 'syncing')));

  // Process mutations in parallel batches with rate limit handling
  const { results, rateLimitHit, rateLimitRetries } = await processBatchWithRateLimit(
    mutations,
    processMutation,
    (retryNumber, delayMs) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Rate limited. Retry ${retryNumber}/${5} after ${delayMs}ms`);
      }
    }
  );

  // Log rate limit info if it occurred
  if (rateLimitHit && process.env.NODE_ENV !== 'production') {
    console.log(`Sync completed with ${rateLimitRetries} rate limit retries`);
  }

  // Process results - handle success, conflict, and error cases
  for (const result of results) {
    const mutation = mutations.find(m => m.id === result.mutationId);
    if (!mutation) continue;

    progress.current++;

    if (result.success) {
      await updateMutationStatus(mutation.id, 'synced');
      await deleteMutation(mutation.id);
    } else if (result.conflict) {
      await markMutationConflict(mutation.id, result.conflict);
      progress.conflicts.push(result);
    } else {
      await updateMutationStatus(mutation.id, 'failed', result.error);
      progress.errors.push(result);
    }

    onProgress?.(progress);
  }

  // Determine final status
  const hasIssues = progress.errors.length > 0 || progress.conflicts.length > 0;
  if (!hasIssues) {
    progress.status = 'synced';
  } else if (progress.errors.length + progress.conflicts.length < mutations.length) {
    progress.status = 'synced'; // Partial success
  } else {
    progress.status = 'error';
  }

  progress.lastSyncedAt = new Date().toISOString();
  onProgress?.(progress);

  // Track sync metrics in Sentry
  trackSyncMetrics(progress);
  // Update sync context with latest sync time
  setSyncContext(progress.lastSyncedAt);

  return progress;
}

/**
 * Check if Background Sync API is available
 */
export function isBackgroundSyncAvailable(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window;
}

/**
 * Register a background sync event
 */
export async function registerBackgroundSync(tag: string = 'sync-mutations'): Promise<boolean> {
  if (!isBackgroundSyncAvailable()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (registration as any).sync.register(tag);
    return true;
  } catch (err) {
    console.error('Failed to register background sync:', err);
    return false;
  }
}

/**
 * Request sync - either via Background Sync API or immediate processing
 */
export async function requestSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  // Try Background Sync first
  const registered = await registerBackgroundSync();

  if (registered) {
    // Background sync will handle it, return early progress
    return {
      status: 'syncing',
      current: 0,
      total: 0,
      lastSyncedAt: null,
      errors: [],
      conflicts: [],
    };
  }

  // Fallback to immediate processing
  return processAllMutations(onProgress);
}
