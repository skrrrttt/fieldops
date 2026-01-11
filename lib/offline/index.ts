/**
 * Offline module - IndexedDB storage for offline-first functionality
 *
 * Usage:
 * import { getDB, saveToLocal, getFromLocal, clearLocal } from '@/lib/offline';
 */

// Database and core types
export {
  getDB,
  isIndexedDBAvailable,
  getSyncTimestamp,
  updateSyncTimestamp,
  getAllSyncMeta,
  type TableName,
  type LocalTask,
  type LocalComment,
  type LocalPhoto,
  type LocalFile,
  type SyncMeta,
  // Mutation queue types
  type MutationType,
  type MutationStatus,
  type PendingMutation,
  type StatusMutationPayload,
  type CommentMutationPayload,
  type PhotoMutationPayload,
  type FileMutationPayload,
  type MutationPayload,
  type PendingStatusMutation,
  type PendingCommentMutation,
  type PendingPhotoMutation,
  type PendingFileMutation,
  type TypedPendingMutation,
  // Conflict types
  type ConflictInfo,
} from './db';

// Helper functions
export {
  // Single item operations
  saveToLocal,
  getFromLocal,
  deleteFromLocal,
  // Bulk operations
  saveAllToLocal,
  getAllFromLocal,
  getFilteredFromLocal,
  deleteAllFromLocal,
  // Clear operations
  clearLocal,
  clearAllLocal,
  // Count
  countLocal,
  // Task-specific helpers
  getTasksFiltered,
  getTaskComments,
  getTaskPhotos,
  getTaskFiles,
  getStatusesSorted,
  getDefaultStatus,
  getCustomFieldsSorted,
} from './helpers';

// React hooks for offline sync
export {
  useOfflineSync,
  useOnlineStatus,
  type OfflineSyncState,
  type UseOfflineSyncOptions,
  type UseOfflineSyncResult,
} from './use-offline-sync';

export {
  useTaskOffline,
  type UseTaskOfflineOptions,
  type UseTaskOfflineResult,
} from './use-task-offline';

// Mutation queue functions
export {
  queueStatusMutation,
  queueCommentMutation,
  queuePhotoMutation,
  queueFileMutation,
  getPendingMutations,
  getAllMutations,
  getMutationsByType,
  getMutationsByStatus,
  getMutation,
  updateMutationStatus,
  deleteMutation,
  getPendingMutationCount,
  getTotalMutationCount,
  getMutationCountByStatus,
  resetFailedMutations,
  clearAllMutations,
  getMutationsSummary,
  // Conflict resolution functions
  markMutationConflict,
  getConflictingMutations,
  resolveConflict,
  getConflictCount,
  type MutationsSummary,
} from './mutation-queue';

// Sync processor functions
export {
  processAllMutations,
  registerBackgroundSync,
  isBackgroundSyncAvailable,
  requestSync,
  type SyncStatus,
  type SyncResult,
  type SyncProgress,
} from './sync-processor';

// Background sync hook
export {
  useBackgroundSync,
  type UseBackgroundSyncResult,
} from './use-background-sync';

// Manual refresh hook
export {
  useManualRefresh,
  type UseManualRefreshOptions,
  type UseManualRefreshResult,
  type RefreshResult,
} from './use-manual-refresh';
