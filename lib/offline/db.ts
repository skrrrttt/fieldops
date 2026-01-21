/**
 * Offline database setup using Dexie.js (IndexedDB wrapper)
 * Mirrors Supabase tables for offline-first functionality
 */

import Dexie, { type Table } from 'dexie';
import type {
  Task,
  Division,
  Status,
  Comment,
  Photo,
  File as FileRecord,
  CustomFieldDefinition,
} from '../database.types';

/**
 * Minimal user info stored with tasks/comments/photos for offline display
 */
export interface LocalUserInfo {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Extended types with related data for denormalized local storage
 */
export interface LocalTask extends Task {
  // Denormalized relations for offline display
  status?: Status;
  division?: Division;
  assigned_user?: LocalUserInfo | null;
}

export interface LocalComment extends Comment {
  user?: { id: string; email: string; display_name?: string | null; avatar_url?: string | null };
}

export interface LocalPhoto extends Photo {
  user?: { id: string; email: string; display_name?: string | null; avatar_url?: string | null };
  // For offline photos, store blob locally
  local_blob?: Blob;
}

export interface LocalFile extends FileRecord {
  user?: { id: string; email: string; display_name?: string | null; avatar_url?: string | null };
  // For offline files, store blob locally
  local_blob?: Blob;
}

/**
 * Sync metadata to track when each table was last synced
 */
export interface SyncMeta {
  id: string; // Table name as ID
  table_name: string;
  last_synced_at: string;
  last_server_updated_at?: string; // Track server timestamp for incremental sync
}

/**
 * Mutation types for offline queue
 */
export type MutationType = 'status' | 'comment' | 'photo' | 'file';

/**
 * Mutation status in the queue
 */
export type MutationStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

/**
 * Conflict information for a mutation
 */
export interface ConflictInfo {
  detected_at: string;
  local_value: unknown;
  server_value: unknown;
  server_updated_at: string;
  field_name: string;
}

/**
 * Base interface for queued mutations
 */
export interface PendingMutation {
  id: string;
  type: MutationType;
  status: MutationStatus;
  created_at: string;
  error_message?: string;
  retry_count: number;
  conflict?: ConflictInfo;
  force_overwrite?: boolean; // Used after conflict resolution to force local change
}

/**
 * Status update mutation payload
 */
export interface StatusMutationPayload {
  task_id: string;
  status_id: string;
  previous_status_id: string;
}

/**
 * Comment mutation payload
 */
export interface CommentMutationPayload {
  task_id: string;
  content: string;
  temp_id: string; // Temporary ID for optimistic UI
}

/**
 * Photo mutation payload
 */
export interface PhotoMutationPayload {
  task_id: string;
  blob: Blob; // Store the actual blob for offline photos
  timestamp: string;
  gps_lat: number | null;
  gps_lng: number | null;
  temp_id: string; // Temporary ID for optimistic UI
}

/**
 * File mutation payload
 */
export interface FileMutationPayload {
  task_id: string;
  blob: Blob; // Store the actual blob for offline files
  file_name: string;
  file_size: number;
  temp_id: string; // Temporary ID for optimistic UI
}

/**
 * Union type for all mutation payloads
 */
export type MutationPayload =
  | StatusMutationPayload
  | CommentMutationPayload
  | PhotoMutationPayload
  | FileMutationPayload;

/**
 * Pending mutation with typed payload
 */
export interface PendingStatusMutation extends PendingMutation {
  type: 'status';
  payload: StatusMutationPayload;
}

export interface PendingCommentMutation extends PendingMutation {
  type: 'comment';
  payload: CommentMutationPayload;
}

export interface PendingPhotoMutation extends PendingMutation {
  type: 'photo';
  payload: PhotoMutationPayload;
}

export interface PendingFileMutation extends PendingMutation {
  type: 'file';
  payload: FileMutationPayload;
}

/**
 * Union type for all pending mutations with their payloads
 */
export type TypedPendingMutation =
  | PendingStatusMutation
  | PendingCommentMutation
  | PendingPhotoMutation
  | PendingFileMutation;

/**
 * FieldOps offline database class
 */
class FieldOpsDB extends Dexie {
  // Table declarations with types
  tasks!: Table<LocalTask, string>;
  divisions!: Table<Division, string>;
  statuses!: Table<Status, string>;
  comments!: Table<LocalComment, string>;
  photos!: Table<LocalPhoto, string>;
  files!: Table<LocalFile, string>;
  custom_field_definitions!: Table<CustomFieldDefinition, string>;
  sync_meta!: Table<SyncMeta, string>;
  pending_mutations!: Table<TypedPendingMutation, string>;

  constructor() {
    super('prostreet_db');

    // Define schema version 1 - original tables
    this.version(1).stores({
      // Tasks table - indexed by id, status_id, division_id, assigned_user_id for filtering
      tasks: 'id, status_id, division_id, assigned_user_id, due_date, created_at, updated_at, deleted_at',

      // Divisions table - indexed by id
      divisions: 'id, name, created_at',

      // Statuses table - indexed by id, order for sorting
      statuses: 'id, order, is_default, created_at',

      // Comments table - indexed by id, task_id for filtering by task
      comments: 'id, task_id, user_id, created_at',

      // Photos table - indexed by id, task_id for filtering by task
      photos: 'id, task_id, user_id, created_at',

      // Files table - indexed by id, task_id for filtering by task
      files: 'id, task_id, user_id, created_at',

      // Custom field definitions - indexed by id, order for sorting
      custom_field_definitions: 'id, order, created_at',

      // Sync metadata - track last sync time per table
      sync_meta: 'id, table_name, last_synced_at',
    });

    // Version 2 - add pending_mutations table for offline queue
    this.version(2).stores({
      // Keep existing tables (null means no change)
      tasks: 'id, status_id, division_id, assigned_user_id, due_date, created_at, updated_at, deleted_at',
      divisions: 'id, name, created_at',
      statuses: 'id, order, is_default, created_at',
      comments: 'id, task_id, user_id, created_at',
      photos: 'id, task_id, user_id, created_at',
      files: 'id, task_id, user_id, created_at',
      custom_field_definitions: 'id, order, created_at',
      sync_meta: 'id, table_name, last_synced_at',

      // New pending_mutations table - indexed by id, type, status for queue processing
      pending_mutations: 'id, type, status, created_at',
    });

    // Version 3 - replace due_date with start_date and end_date
    this.version(3).stores({
      // Update tasks table to use start_date and end_date
      tasks: 'id, status_id, division_id, assigned_user_id, start_date, end_date, created_at, updated_at, deleted_at',
      divisions: 'id, name, created_at',
      statuses: 'id, order, is_default, created_at',
      comments: 'id, task_id, user_id, created_at',
      photos: 'id, task_id, user_id, created_at',
      files: 'id, task_id, user_id, created_at',
      custom_field_definitions: 'id, order, created_at',
      sync_meta: 'id, table_name, last_synced_at',
      pending_mutations: 'id, type, status, created_at',
    });
  }
}

// Singleton instance
let dbInstance: FieldOpsDB | null = null;

/**
 * Get the database instance (creates if needed)
 * Only available in browser environment
 */
export function getDB(): FieldOpsDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser environment');
  }

  if (!dbInstance) {
    dbInstance = new FieldOpsDB();
  }

  return dbInstance;
}

/**
 * Check if we're in a browser environment with IndexedDB support
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

// Table name type for type safety
export type TableName =
  | 'tasks'
  | 'divisions'
  | 'statuses'
  | 'comments'
  | 'photos'
  | 'files'
  | 'custom_field_definitions';

/**
 * Get sync timestamp for a table
 */
export async function getSyncTimestamp(tableName: TableName): Promise<string | null> {
  if (!isIndexedDBAvailable()) return null;

  const db = getDB();
  const meta = await db.sync_meta.get(tableName);
  return meta?.last_synced_at ?? null;
}

/**
 * Update sync timestamp for a table
 */
export async function updateSyncTimestamp(
  tableName: TableName,
  timestamp?: string,
  serverUpdatedAt?: string
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  const now = timestamp ?? new Date().toISOString();

  await db.sync_meta.put({
    id: tableName,
    table_name: tableName,
    last_synced_at: now,
    last_server_updated_at: serverUpdatedAt,
  });
}

/**
 * Get all sync metadata
 */
export async function getAllSyncMeta(): Promise<SyncMeta[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.sync_meta.toArray();
}
