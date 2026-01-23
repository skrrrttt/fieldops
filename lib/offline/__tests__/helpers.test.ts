import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import type {
  TypedPendingMutation,
  LocalTask,
  LocalComment,
  LocalPhoto,
  LocalFile,
  MutationStatus,
} from '../db';
import type { Division, Status, CustomFieldDefinition } from '../../database.types';

/**
 * Extended test database that includes all tables for testing helpers
 */
class HelpersTestDB extends Dexie {
  tasks!: Dexie.Table<LocalTask, string>;
  divisions!: Dexie.Table<Division, string>;
  statuses!: Dexie.Table<Status, string>;
  comments!: Dexie.Table<LocalComment, string>;
  photos!: Dexie.Table<LocalPhoto, string>;
  files!: Dexie.Table<LocalFile, string>;
  custom_field_definitions!: Dexie.Table<CustomFieldDefinition, string>;
  pending_mutations!: Dexie.Table<TypedPendingMutation, string>;
  sync_meta!: Dexie.Table<{ id: string; table_name: string; last_synced_at: string }, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      tasks: 'id, status_id, division_id, assigned_user_id, start_date, end_date, created_at',
      divisions: 'id, name, created_at',
      statuses: 'id, order, is_default, created_at',
      comments: 'id, task_id, user_id, created_at',
      photos: 'id, task_id, user_id, created_at',
      files: 'id, task_id, user_id, created_at',
      custom_field_definitions: 'id, order, created_at',
      pending_mutations: 'id, type, status, created_at',
      sync_meta: 'id, table_name, last_synced_at',
    });
  }
}

let testDB: HelpersTestDB;
let dbName: string;

// Mock the db module to use our test database
vi.mock('../db', async () => {
  const actual = await vi.importActual('../db');
  return {
    ...actual,
    isIndexedDBAvailable: () => true,
    getDB: () => testDB,
  };
});

// Import after mock setup
import {
  saveToLocal,
  saveAllToLocal,
  getFromLocal,
  getAllFromLocal,
  deleteFromLocal,
  deleteAllFromLocal,
  clearLocal,
  countLocal,
} from '../helpers';

import { clearSyncedMutations, queueStatusMutation, updateMutationStatus } from '../mutation-queue';

// Helper to create mock tasks
function createMockTask(overrides: Partial<LocalTask> = {}): LocalTask {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    title: `Test Task ${id}`,
    description: 'Test description',
    status_id: 'status-1',
    division_id: 'division-1',
    assigned_user_id: null,
    priority: 'medium',
    start_date: null,
    end_date: null,
    custom_fields: {},
    address: null,
    gps_lat: null,
    gps_lng: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  } as LocalTask;
}

// Helper to create mock comments
function createMockComment(overrides: Partial<LocalComment> = {}): LocalComment {
  const id = `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    task_id: 'task-1',
    user_id: 'user-1',
    content: 'Test comment content',
    created_at: new Date().toISOString(),
    ...overrides,
  } as LocalComment;
}

describe('helpers - type-safe table operations', () => {
  beforeEach(() => {
    dbName = `test_helpers_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    testDB = new HelpersTestDB(dbName);
  });

  afterEach(async () => {
    if (testDB) {
      testDB.close();
      await Dexie.delete(dbName);
    }
  });

  describe('saveToLocal and getFromLocal', () => {
    it('should save and retrieve a task', async () => {
      const task = createMockTask({ title: 'Save Test Task' });

      await saveToLocal('tasks', task);
      const retrieved = await getFromLocal('tasks', task.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
      expect(retrieved?.title).toBe('Save Test Task');
    });

    it('should save and retrieve a comment', async () => {
      const comment = createMockComment({ content: 'Test save comment' });

      await saveToLocal('comments', comment);
      const retrieved = await getFromLocal('comments', comment.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(comment.id);
      expect(retrieved?.content).toBe('Test save comment');
    });

    it('should overwrite existing item with same ID', async () => {
      const task = createMockTask({ title: 'Original Title' });
      await saveToLocal('tasks', task);

      const updatedTask = { ...task, title: 'Updated Title' };
      await saveToLocal('tasks', updatedTask);

      const retrieved = await getFromLocal('tasks', task.id);
      expect(retrieved?.title).toBe('Updated Title');

      // Should still only have one item
      const count = await countLocal('tasks');
      expect(count).toBe(1);
    });

    it('should return undefined for non-existent ID', async () => {
      const retrieved = await getFromLocal('tasks', 'non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('saveAllToLocal and getAllFromLocal', () => {
    it('should save and retrieve multiple tasks', async () => {
      const tasks = [
        createMockTask({ title: 'Task 1' }),
        createMockTask({ title: 'Task 2' }),
        createMockTask({ title: 'Task 3' }),
      ];

      await saveAllToLocal('tasks', tasks);
      const retrieved = await getAllFromLocal('tasks');

      expect(retrieved).toHaveLength(3);
      expect(retrieved.map((t) => t.title)).toContain('Task 1');
      expect(retrieved.map((t) => t.title)).toContain('Task 2');
      expect(retrieved.map((t) => t.title)).toContain('Task 3');
    });

    it('should return empty array when table is empty', async () => {
      const retrieved = await getAllFromLocal('tasks');
      expect(retrieved).toEqual([]);
    });

    it('should save multiple comments', async () => {
      const comments = [
        createMockComment({ content: 'Comment 1' }),
        createMockComment({ content: 'Comment 2' }),
      ];

      await saveAllToLocal('comments', comments);
      const retrieved = await getAllFromLocal('comments');

      expect(retrieved).toHaveLength(2);
    });
  });

  describe('deleteFromLocal', () => {
    it('should delete a single task by ID', async () => {
      const task = createMockTask();
      await saveToLocal('tasks', task);

      let count = await countLocal('tasks');
      expect(count).toBe(1);

      await deleteFromLocal('tasks', task.id);

      count = await countLocal('tasks');
      expect(count).toBe(0);

      const retrieved = await getFromLocal('tasks', task.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not throw when deleting non-existent ID', async () => {
      await expect(deleteFromLocal('tasks', 'non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('deleteAllFromLocal', () => {
    it('should delete multiple items by IDs', async () => {
      const tasks = [
        createMockTask({ title: 'Task 1' }),
        createMockTask({ title: 'Task 2' }),
        createMockTask({ title: 'Task 3' }),
      ];
      await saveAllToLocal('tasks', tasks);

      // Delete first two
      await deleteAllFromLocal('tasks', [tasks[0].id, tasks[1].id]);

      const remaining = await getAllFromLocal('tasks');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe('Task 3');
    });

    it('should handle empty IDs array', async () => {
      const task = createMockTask();
      await saveToLocal('tasks', task);

      await deleteAllFromLocal('tasks', []);

      const count = await countLocal('tasks');
      expect(count).toBe(1);
    });
  });

  describe('clearLocal', () => {
    it('should clear all items from a specific table', async () => {
      const tasks = [createMockTask(), createMockTask(), createMockTask()];
      const comments = [createMockComment(), createMockComment()];

      await saveAllToLocal('tasks', tasks);
      await saveAllToLocal('comments', comments);

      await clearLocal('tasks');

      const taskCount = await countLocal('tasks');
      const commentCount = await countLocal('comments');

      expect(taskCount).toBe(0);
      expect(commentCount).toBe(2); // Comments should be unaffected
    });

    it('should not throw when clearing empty table', async () => {
      await expect(clearLocal('tasks')).resolves.not.toThrow();
    });
  });

  describe('countLocal', () => {
    it('should return correct count of items', async () => {
      expect(await countLocal('tasks')).toBe(0);

      await saveToLocal('tasks', createMockTask());
      expect(await countLocal('tasks')).toBe(1);

      await saveToLocal('tasks', createMockTask());
      expect(await countLocal('tasks')).toBe(2);

      await saveToLocal('tasks', createMockTask());
      expect(await countLocal('tasks')).toBe(3);
    });

    it('should count items in different tables independently', async () => {
      await saveAllToLocal('tasks', [createMockTask(), createMockTask()]);
      await saveAllToLocal('comments', [createMockComment()]);

      expect(await countLocal('tasks')).toBe(2);
      expect(await countLocal('comments')).toBe(1);
    });
  });
});

describe('clearSyncedMutations', () => {
  beforeEach(() => {
    dbName = `test_clear_synced_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    testDB = new HelpersTestDB(dbName);
  });

  afterEach(async () => {
    if (testDB) {
      testDB.close();
      await Dexie.delete(dbName);
    }
  });

  it('should delete mutations with synced status', async () => {
    // Create some mutations
    const m1 = await queueStatusMutation({
      task_id: 'task-1',
      status_id: 's1',
      previous_status_id: 's0',
    });
    const m2 = await queueStatusMutation({
      task_id: 'task-2',
      status_id: 's2',
      previous_status_id: 's1',
    });
    const m3 = await queueStatusMutation({
      task_id: 'task-3',
      status_id: 's3',
      previous_status_id: 's2',
    });

    // Mark first two as synced
    await updateMutationStatus(m1!.id, 'synced' as MutationStatus);
    await updateMutationStatus(m2!.id, 'synced' as MutationStatus);

    // Verify initial state
    const beforeCount = await testDB.pending_mutations.count();
    expect(beforeCount).toBe(3);

    // Clear synced mutations
    const deletedCount = await clearSyncedMutations();

    expect(deletedCount).toBe(2);

    // Verify only pending mutation remains
    const afterCount = await testDB.pending_mutations.count();
    expect(afterCount).toBe(1);

    const remaining = await testDB.pending_mutations.toArray();
    expect(remaining[0].id).toBe(m3!.id);
    expect(remaining[0].status).toBe('pending');
  });

  it('should return 0 when no synced mutations exist', async () => {
    // Create pending mutations only
    await queueStatusMutation({
      task_id: 'task-1',
      status_id: 's1',
      previous_status_id: 's0',
    });
    await queueStatusMutation({
      task_id: 'task-2',
      status_id: 's2',
      previous_status_id: 's1',
    });

    const deletedCount = await clearSyncedMutations();

    expect(deletedCount).toBe(0);

    // All mutations should still exist
    const count = await testDB.pending_mutations.count();
    expect(count).toBe(2);
  });

  it('should delete multiple synced mutations in batch', async () => {
    // Create and sync multiple mutations
    const mutations = [];
    for (let i = 0; i < 5; i++) {
      const m = await queueStatusMutation({
        task_id: `task-${i}`,
        status_id: `s${i + 1}`,
        previous_status_id: `s${i}`,
      });
      mutations.push(m);
    }

    // Mark all as synced
    for (const m of mutations) {
      await updateMutationStatus(m!.id, 'synced' as MutationStatus);
    }

    const deletedCount = await clearSyncedMutations();

    expect(deletedCount).toBe(5);

    const afterCount = await testDB.pending_mutations.count();
    expect(afterCount).toBe(0);
  });

  it('should not delete mutations with other statuses', async () => {
    const m1 = await queueStatusMutation({
      task_id: 'task-pending',
      status_id: 's1',
      previous_status_id: 's0',
    });
    const m2 = await queueStatusMutation({
      task_id: 'task-syncing',
      status_id: 's2',
      previous_status_id: 's1',
    });
    const m3 = await queueStatusMutation({
      task_id: 'task-failed',
      status_id: 's3',
      previous_status_id: 's2',
    });
    const m4 = await queueStatusMutation({
      task_id: 'task-synced',
      status_id: 's4',
      previous_status_id: 's3',
    });

    // Set various statuses
    await updateMutationStatus(m2!.id, 'syncing');
    await updateMutationStatus(m3!.id, 'failed', 'test error');
    await updateMutationStatus(m4!.id, 'synced' as MutationStatus);

    const deletedCount = await clearSyncedMutations();

    expect(deletedCount).toBe(1); // Only synced one

    // Check remaining mutations
    const remaining = await testDB.pending_mutations.toArray();
    expect(remaining).toHaveLength(3);

    const statuses = remaining.map((m) => m.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('syncing');
    expect(statuses).toContain('failed');
    expect(statuses).not.toContain('synced');
  });
});
