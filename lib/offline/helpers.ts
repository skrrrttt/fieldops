/**
 * Helper functions for offline data storage
 * Provides saveToLocal, getFromLocal, and clearLocal operations
 *
 * Note: Uses switch/case pattern for type-safe table access instead of
 * dynamic property access with `any` casts.
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
  switch (tableName) {
    case 'tasks':
      await db.tasks.put(data as LocalTask);
      break;
    case 'divisions':
      await db.divisions.put(data as Division);
      break;
    case 'statuses':
      await db.statuses.put(data as Status);
      break;
    case 'comments':
      await db.comments.put(data as LocalComment);
      break;
    case 'photos':
      await db.photos.put(data as LocalPhoto);
      break;
    case 'files':
      await db.files.put(data as LocalFile);
      break;
    case 'custom_field_definitions':
      await db.custom_field_definitions.put(data as CustomFieldDefinition);
      break;
  }
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
  switch (tableName) {
    case 'tasks':
      await db.tasks.bulkPut(items as LocalTask[]);
      break;
    case 'divisions':
      await db.divisions.bulkPut(items as Division[]);
      break;
    case 'statuses':
      await db.statuses.bulkPut(items as Status[]);
      break;
    case 'comments':
      await db.comments.bulkPut(items as LocalComment[]);
      break;
    case 'photos':
      await db.photos.bulkPut(items as LocalPhoto[]);
      break;
    case 'files':
      await db.files.bulkPut(items as LocalFile[]);
      break;
    case 'custom_field_definitions':
      await db.custom_field_definitions.bulkPut(items as CustomFieldDefinition[]);
      break;
  }

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
  switch (tableName) {
    case 'tasks':
      return (await db.tasks.get(id)) as TableDataMap[T] | undefined;
    case 'divisions':
      return (await db.divisions.get(id)) as TableDataMap[T] | undefined;
    case 'statuses':
      return (await db.statuses.get(id)) as TableDataMap[T] | undefined;
    case 'comments':
      return (await db.comments.get(id)) as TableDataMap[T] | undefined;
    case 'photos':
      return (await db.photos.get(id)) as TableDataMap[T] | undefined;
    case 'files':
      return (await db.files.get(id)) as TableDataMap[T] | undefined;
    case 'custom_field_definitions':
      return (await db.custom_field_definitions.get(id)) as TableDataMap[T] | undefined;
  }
}

/**
 * Get all items from a table
 */
export async function getAllFromLocal<T extends TableName>(
  tableName: T
): Promise<TableDataMap[T][]> {
  if (!isIndexedDBAvailable()) return [];

  const db = getDB();
  switch (tableName) {
    case 'tasks':
      return (await db.tasks.toArray()) as TableDataMap[T][];
    case 'divisions':
      return (await db.divisions.toArray()) as TableDataMap[T][];
    case 'statuses':
      return (await db.statuses.toArray()) as TableDataMap[T][];
    case 'comments':
      return (await db.comments.toArray()) as TableDataMap[T][];
    case 'photos':
      return (await db.photos.toArray()) as TableDataMap[T][];
    case 'files':
      return (await db.files.toArray()) as TableDataMap[T][];
    case 'custom_field_definitions':
      return (await db.custom_field_definitions.toArray()) as TableDataMap[T][];
  }
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
  switch (tableName) {
    case 'tasks':
      await db.tasks.delete(id);
      break;
    case 'divisions':
      await db.divisions.delete(id);
      break;
    case 'statuses':
      await db.statuses.delete(id);
      break;
    case 'comments':
      await db.comments.delete(id);
      break;
    case 'photos':
      await db.photos.delete(id);
      break;
    case 'files':
      await db.files.delete(id);
      break;
    case 'custom_field_definitions':
      await db.custom_field_definitions.delete(id);
      break;
  }
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
  switch (tableName) {
    case 'tasks':
      await db.tasks.bulkDelete(ids);
      break;
    case 'divisions':
      await db.divisions.bulkDelete(ids);
      break;
    case 'statuses':
      await db.statuses.bulkDelete(ids);
      break;
    case 'comments':
      await db.comments.bulkDelete(ids);
      break;
    case 'photos':
      await db.photos.bulkDelete(ids);
      break;
    case 'files':
      await db.files.bulkDelete(ids);
      break;
    case 'custom_field_definitions':
      await db.custom_field_definitions.bulkDelete(ids);
      break;
  }
}

/**
 * Clear all data from a specific table
 */
export async function clearLocal(tableName: TableName): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  switch (tableName) {
    case 'tasks':
      await db.tasks.clear();
      break;
    case 'divisions':
      await db.divisions.clear();
      break;
    case 'statuses':
      await db.statuses.clear();
      break;
    case 'comments':
      await db.comments.clear();
      break;
    case 'photos':
      await db.photos.clear();
      break;
    case 'files':
      await db.files.clear();
      break;
    case 'custom_field_definitions':
      await db.custom_field_definitions.clear();
      break;
  }
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
    db.pending_mutations.clear(),
  ]);
}

/**
 * Count items in a table
 */
export async function countLocal(tableName: TableName): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;

  const db = getDB();
  switch (tableName) {
    case 'tasks':
      return db.tasks.count();
    case 'divisions':
      return db.divisions.count();
    case 'statuses':
      return db.statuses.count();
    case 'comments':
      return db.comments.count();
    case 'photos':
      return db.photos.count();
    case 'files':
      return db.files.count();
    case 'custom_field_definitions':
      return db.custom_field_definitions.count();
  }
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
