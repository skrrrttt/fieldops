/**
 * Helper functions for offline data storage
 * Provides saveToLocal, getFromLocal, and clearLocal operations
 */

import {
  getDB,
  isIndexedDBAvailable,
  updateSyncTimestamp,
  type TableName,
  type LocalTask,
  type LocalComment,
  type LocalPhoto,
  type LocalFile,
} from './db';
import type {
  Division,
  Status,
  CustomFieldDefinition,
} from '../database.types';

// Type mapping for each table
type TableDataMap = {
  tasks: LocalTask;
  divisions: Division;
  statuses: Status;
  comments: LocalComment;
  photos: LocalPhoto;
  files: LocalFile;
  custom_field_definitions: CustomFieldDefinition;
};

/**
 * Save a single item to local storage
 */
export async function saveToLocal<T extends TableName>(
  tableName: T,
  data: TableDataMap[T]
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[tableName] as any).put(data);
}

/**
 * Save multiple items to local storage (batch operation)
 */
export async function saveAllToLocal<T extends TableName>(
  tableName: T,
  items: TableDataMap[T][],
  updateTimestamp = true
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[tableName] as any).bulkPut(items);

  if (updateTimestamp) {
    await updateSyncTimestamp(tableName);
  }
}

/**
 * Get a single item from local storage by ID
 */
export async function getFromLocal<T extends TableName>(
  tableName: T,
  id: string
): Promise<TableDataMap[T] | undefined> {
  if (!isIndexedDBAvailable()) return undefined;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db[tableName] as any).get(id);
}

/**
 * Get all items from a table
 */
export async function getAllFromLocal<T extends TableName>(
  tableName: T
): Promise<TableDataMap[T][]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db[tableName] as any).toArray();
}

/**
 * Get items matching a filter condition
 */
export async function getFilteredFromLocal<T extends TableName>(
  tableName: T,
  indexName: string,
  value: string | number | boolean
): Promise<TableDataMap[T][]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db[tableName] as any).where(indexName).equals(value).toArray();
}

/**
 * Delete a single item from local storage by ID
 */
export async function deleteFromLocal<T extends TableName>(
  tableName: T,
  id: string
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[tableName] as any).delete(id);
}

/**
 * Delete multiple items by IDs
 */
export async function deleteAllFromLocal<T extends TableName>(
  tableName: T,
  ids: string[]
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[tableName] as any).bulkDelete(ids);
}

/**
 * Clear all data from a specific table
 */
export async function clearLocal(tableName: TableName): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db[tableName] as any).clear();
}

/**
 * Clear all data from all tables
 */
export async function clearAllLocal(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  await Promise.all([
    db.tasks.clear(),
    db.divisions.clear(),
    db.statuses.clear(),
    db.comments.clear(),
    db.photos.clear(),
    db.files.clear(),
    db.custom_field_definitions.clear(),
    db.sync_meta.clear(),
  ]);
}

/**
 * Count items in a table
 */
export async function countLocal(tableName: TableName): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db[tableName] as any).count();
}

// ============================================
// Task-specific helpers
// ============================================

/**
 * Get tasks filtered by status and/or division
 */
export async function getTasksFiltered(options: {
  statusId?: string;
  divisionId?: string;
  includeDeleted?: boolean;
}): Promise<LocalTask[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  let tasks = await db.tasks.toArray();

  // Filter out deleted tasks unless explicitly requested
  if (!options.includeDeleted) {
    tasks = tasks.filter((t) => !t.deleted_at);
  }

  if (options.statusId) {
    tasks = tasks.filter((t) => t.status_id === options.statusId);
  }

  if (options.divisionId) {
    tasks = tasks.filter((t) => t.division_id === options.divisionId);
  }

  return tasks;
}

/**
 * Get comments for a specific task
 */
export async function getTaskComments(taskId: string): Promise<LocalComment[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.comments.where('task_id').equals(taskId).toArray();
}

/**
 * Get photos for a specific task
 */
export async function getTaskPhotos(taskId: string): Promise<LocalPhoto[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.photos.where('task_id').equals(taskId).toArray();
}

/**
 * Get files for a specific task
 */
export async function getTaskFiles(taskId: string): Promise<LocalFile[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.files.where('task_id').equals(taskId).toArray();
}

/**
 * Get statuses sorted by order
 */
export async function getStatusesSorted(): Promise<Status[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.statuses.orderBy('order').toArray();
}

/**
 * Get default status
 */
export async function getDefaultStatus(): Promise<Status | undefined> {
  if (!isIndexedDBAvailable()) return undefined;

  const db = getDB();
  return db.statuses.where('is_default').equals(1).first();
}

/**
 * Get custom field definitions sorted by order
 */
export async function getCustomFieldsSorted(): Promise<CustomFieldDefinition[]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  return db.custom_field_definitions.orderBy('order').toArray();
}
