/**
 * Mutation queue helper functions for offline support
 * Handles queueing, retrieving, and managing pending mutations
 */

import {
  getDB,
  isIndexedDBAvailable,
  type MutationType,
  type MutationStatus,
  type TypedPendingMutation,
  type PendingStatusMutation,
  type PendingCommentMutation,
  type PendingPhotoMutation,
  type PendingFileMutation,
  type PendingSegmentCompleteMutation,
  type StatusMutationPayload,
  type CommentMutationPayload,
  type PhotoMutationPayload,
  type FileMutationPayload,
  type SegmentCompleteMutationPayload,
  type ConflictInfo,
} from './db';

/**
 * Generate a unique ID for a mutation
 */
function generateMutationId(): string {
  return `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Queue a status update mutation
 */
export async function queueStatusMutation(
  payload: StatusMutationPayload
): Promise<PendingStatusMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation: PendingStatusMutation = {
    id: generateMutationId(),
    type: 'status',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload,
  };

  await db.pending_mutations.put(mutation);
  return mutation;
}

/**
 * Queue a comment mutation
 */
export async function queueCommentMutation(
  payload: CommentMutationPayload
): Promise<PendingCommentMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation: PendingCommentMutation = {
    id: generateMutationId(),
    type: 'comment',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload,
  };

  await db.pending_mutations.put(mutation);
  return mutation;
}

/**
 * Queue a photo upload mutation
 */
export async function queuePhotoMutation(
  payload: PhotoMutationPayload
): Promise<PendingPhotoMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation: PendingPhotoMutation = {
    id: generateMutationId(),
    type: 'photo',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload,
  };

  await db.pending_mutations.put(mutation);
  return mutation;
}

/**
 * Queue a file upload mutation
 */
export async function queueFileMutation(
  payload: FileMutationPayload
): Promise<PendingFileMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation: PendingFileMutation = {
    id: generateMutationId(),
    type: 'file',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload,
  };

  await db.pending_mutations.put(mutation);
  return mutation;
}

/**
 * Queue a segment completion mutation
 */
export async function queueSegmentCompleteMutation(
  payload: SegmentCompleteMutationPayload
): Promise<PendingSegmentCompleteMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation: PendingSegmentCompleteMutation = {
    id: generateMutationId(),
    type: 'segment_complete',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload,
  };

  await db.pending_mutations.put(mutation);
  return mutation;
}

/**
 * Get all pending mutations sorted by created_at (FIFO)
 */
export async function getPendingMutations(): Promise<TypedPendingMutation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.pending_mutations
    .where('status')
    .equals('pending')
    .sortBy('created_at');
}

/**
 * Get all mutations (including syncing and failed)
 */
export async function getAllMutations(): Promise<TypedPendingMutation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.pending_mutations.orderBy('created_at').toArray();
}

/**
 * Get mutations by type
 */
export async function getMutationsByType(
  type: MutationType
): Promise<TypedPendingMutation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.pending_mutations
    .where('type')
    .equals(type)
    .sortBy('created_at');
}

/**
 * Get mutations by status
 */
export async function getMutationsByStatus(
  status: MutationStatus
): Promise<TypedPendingMutation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.pending_mutations
    .where('status')
    .equals(status)
    .sortBy('created_at');
}

/**
 * Get a single mutation by ID
 */
export async function getMutation(
  id: string
): Promise<TypedPendingMutation | undefined> {
  if (!isIndexedDBAvailable()) return undefined;

  const db = getDB();
  return db.pending_mutations.get(id);
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(
  id: string,
  status: MutationStatus,
  errorMessage?: string
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  const mutation = await db.pending_mutations.get(id);

  if (mutation) {
    const updates: Partial<TypedPendingMutation> = { status };

    if (errorMessage !== undefined) {
      updates.error_message = errorMessage;
    }

    if (status === 'failed') {
      updates.retry_count = (mutation.retry_count || 0) + 1;
    }

    await db.pending_mutations.update(id, updates);
  }
}

/**
 * Delete a mutation from the queue
 */
export async function deleteMutation(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  await db.pending_mutations.delete(id);
}

/**
 * Delete all mutations that were successfully synced
 * Returns the number of mutations deleted
 */
export async function clearSyncedMutations(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  const synced = await db.pending_mutations
    .where('status')
    .equals('synced')
    .toArray();

  if (synced.length === 0) {
    return 0;
  }

  const ids = synced.map((m) => m.id);
  await db.pending_mutations.bulkDelete(ids);
  return ids.length;
}

/**
 * Get count of pending mutations
 */
export async function getPendingMutationCount(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  return db.pending_mutations.where('status').equals('pending').count();
}

/**
 * Get count of all mutations (pending + failed)
 */
export async function getTotalMutationCount(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  return db.pending_mutations.count();
}

/**
 * Get count by status
 */
export async function getMutationCountByStatus(
  status: MutationStatus
): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  return db.pending_mutations.where('status').equals(status).count();
}

const MAX_RETRY_COUNT = 5;

/**
 * Reset failed mutations back to pending for retry
 * Only resets mutations that haven't exceeded the max retry limit
 */
export async function resetFailedMutations(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  const failed = await db.pending_mutations
    .where('status')
    .equals('failed')
    .toArray();

  let count = 0;
  for (const mutation of failed) {
    if ((mutation.retry_count || 0) < MAX_RETRY_COUNT) {
      await db.pending_mutations.update(mutation.id, {
        status: 'pending',
        error_message: undefined,
      });
      count++;
    }
  }

  return count;
}

/**
 * Clear all mutations (use with caution)
 */
export async function clearAllMutations(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  await db.pending_mutations.clear();
}

/**
 * Get mutations summary for UI display
 */
export interface MutationsSummary {
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  conflict: number;
  byType: {
    status: number;
    comment: number;
    photo: number;
    file: number;
    segment_complete: number;
  };
}

export async function getMutationsSummary(): Promise<MutationsSummary> {
  if (!isIndexedDBAvailable()) {
    return {
      total: 0,
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
      byType: { status: 0, comment: 0, photo: 0, file: 0, segment_complete: 0 },
    };
  }

  const db = getDB();
  const all = await db.pending_mutations.toArray();

  const summary: MutationsSummary = {
    total: all.length,
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
    byType: { status: 0, comment: 0, photo: 0, file: 0, segment_complete: 0 },
  };

  for (const mutation of all) {
    // Count by status
    if (mutation.status === 'pending') summary.pending++;
    else if (mutation.status === 'syncing') summary.syncing++;
    else if (mutation.status === 'synced') summary.synced++;
    else if (mutation.status === 'failed') summary.failed++;
    else if (mutation.status === 'conflict') summary.conflict++;

    // Count by type
    summary.byType[mutation.type]++;
  }

  return summary;
}

/**
 * Mark a mutation as having a conflict
 */
export async function markMutationConflict(
  id: string,
  conflict: ConflictInfo
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  const mutation = await db.pending_mutations.get(id);

  if (mutation) {
    await db.pending_mutations.update(id, {
      status: 'conflict',
      conflict,
    });
  }
}

/**
 * Get all mutations with conflicts
 */
export async function getConflictingMutations(): Promise<TypedPendingMutation[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.pending_mutations
    .where('status')
    .equals('conflict')
    .sortBy('created_at');
}

/**
 * Resolve a conflict by choosing local or server value
 */
export async function resolveConflict(
  mutationId: string,
  resolution: 'local' | 'server'
): Promise<TypedPendingMutation | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const mutation = await db.pending_mutations.get(mutationId);

  if (!mutation || mutation.status !== 'conflict') {
    return null;
  }

  if (resolution === 'local') {
    // Reset to pending so it will be retried with force
    await db.pending_mutations.update(mutationId, {
      status: 'pending',
      conflict: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      force_overwrite: true as any, // Signal to sync processor to force overwrite
    });
    return db.pending_mutations.get(mutationId) as Promise<TypedPendingMutation>;
  } else {
    // Server wins - update local IndexedDB with server value, then delete mutation
    if (mutation.conflict) {
      const { server_value, field_name } = mutation.conflict;
      if (field_name === 'status' && mutation.type === 'status') {
        const task = await db.tasks.get(mutation.payload.task_id);
        if (task) {
          task.status_id = server_value as string;
          await db.tasks.put(task);
        }
      }
    }
    await db.pending_mutations.delete(mutationId);
    return null;
  }
}

/**
 * Recover stuck mutations that were left in 'syncing' state
 * (e.g. due to app crash or tab close during sync)
 */
export async function recoverStuckMutations(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  const stuck = await db.pending_mutations
    .where('status')
    .equals('syncing')
    .toArray();

  for (const mutation of stuck) {
    await db.pending_mutations.update(mutation.id, { status: 'pending' });
  }

  return stuck.length;
}

/**
 * Get conflict count
 */
export async function getConflictCount(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  return db.pending_mutations.where('status').equals('conflict').count();
}
