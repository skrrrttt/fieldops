import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import type { TypedPendingMutation } from '../db';

/**
 * Test database that mirrors production FieldOpsDB schema for pending_mutations
 */
class MutationQueueTestDB extends Dexie {
  pending_mutations!: Dexie.Table<TypedPendingMutation, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      pending_mutations: 'id, type, status, created_at',
    });
  }
}

let testDB: MutationQueueTestDB;
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
  queueStatusMutation,
  queueCommentMutation,
  queuePhotoMutation,
  queueFileMutation,
  getMutation,
  deleteMutation,
  getAllMutations,
  clearAllMutations,
} from '../mutation-queue';

describe('mutation-queue CRUD operations', () => {
  beforeEach(() => {
    // Create a fresh database for each test
    dbName = `test_mutation_queue_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    testDB = new MutationQueueTestDB(dbName);
  });

  afterEach(async () => {
    // Cleanup test database
    if (testDB) {
      testDB.close();
      await Dexie.delete(dbName);
    }
  });

  describe('queueStatusMutation', () => {
    it('should queue a status mutation with correct structure', async () => {
      const payload = {
        task_id: 'task-123',
        status_id: 'status-new',
        previous_status_id: 'status-old',
      };

      const mutation = await queueStatusMutation(payload);

      expect(mutation).not.toBeNull();
      expect(mutation!.type).toBe('status');
      expect(mutation!.status).toBe('pending');
      expect(mutation!.retry_count).toBe(0);
      expect(mutation!.payload).toEqual(payload);
      expect(mutation!.id).toMatch(/^mutation_\d+_/);
      expect(mutation!.created_at).toBeDefined();
    });

    it('should persist status mutation to database', async () => {
      const payload = {
        task_id: 'task-456',
        status_id: 'status-a',
        previous_status_id: 'status-b',
      };

      const mutation = await queueStatusMutation(payload);
      const retrieved = await getMutation(mutation!.id);

      expect(retrieved).toEqual(mutation);
    });
  });

  describe('queueCommentMutation', () => {
    it('should queue a comment mutation with correct structure', async () => {
      const payload = {
        task_id: 'task-789',
        content: 'Test comment content',
        temp_id: 'temp-comment-1',
      };

      const mutation = await queueCommentMutation(payload);

      expect(mutation).not.toBeNull();
      expect(mutation!.type).toBe('comment');
      expect(mutation!.status).toBe('pending');
      expect(mutation!.retry_count).toBe(0);
      expect(mutation!.payload).toEqual(payload);
    });

    it('should persist comment mutation to database', async () => {
      const payload = {
        task_id: 'task-789',
        content: 'Another comment',
        temp_id: 'temp-comment-2',
      };

      const mutation = await queueCommentMutation(payload);
      const retrieved = await getMutation(mutation!.id);

      expect(retrieved).toEqual(mutation);
    });
  });

  describe('queuePhotoMutation', () => {
    it('should queue a photo mutation with correct structure', async () => {
      const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
      const payload = {
        task_id: 'task-photo-1',
        blob,
        timestamp: new Date().toISOString(),
        gps_lat: 37.7749,
        gps_lng: -122.4194,
        temp_id: 'temp-photo-1',
      };

      const mutation = await queuePhotoMutation(payload);

      expect(mutation).not.toBeNull();
      expect(mutation!.type).toBe('photo');
      expect(mutation!.status).toBe('pending');
      expect(mutation!.retry_count).toBe(0);
      expect(mutation!.payload.task_id).toBe('task-photo-1');
      expect(mutation!.payload.gps_lat).toBe(37.7749);
    });

    it('should handle null GPS coordinates', async () => {
      const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
      const payload = {
        task_id: 'task-photo-2',
        blob,
        timestamp: new Date().toISOString(),
        gps_lat: null,
        gps_lng: null,
        temp_id: 'temp-photo-2',
      };

      const mutation = await queuePhotoMutation(payload);

      expect(mutation!.payload.gps_lat).toBeNull();
      expect(mutation!.payload.gps_lng).toBeNull();
    });
  });

  describe('queueFileMutation', () => {
    it('should queue a file mutation with correct structure', async () => {
      const blob = new Blob(['fake file data'], { type: 'application/pdf' });
      const payload = {
        task_id: 'task-file-1',
        blob,
        file_name: 'document.pdf',
        file_size: 1024,
        temp_id: 'temp-file-1',
      };

      const mutation = await queueFileMutation(payload);

      expect(mutation).not.toBeNull();
      expect(mutation!.type).toBe('file');
      expect(mutation!.status).toBe('pending');
      expect(mutation!.retry_count).toBe(0);
      expect(mutation!.payload.file_name).toBe('document.pdf');
      expect(mutation!.payload.file_size).toBe(1024);
    });
  });

  describe('getMutation', () => {
    it('should retrieve a mutation by ID', async () => {
      const payload = {
        task_id: 'task-get-1',
        status_id: 'status-x',
        previous_status_id: 'status-y',
      };

      const created = await queueStatusMutation(payload);
      const retrieved = await getMutation(created!.id);

      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent ID', async () => {
      const retrieved = await getMutation('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteMutation', () => {
    it('should delete a mutation from the queue', async () => {
      const payload = {
        task_id: 'task-delete-1',
        status_id: 'status-1',
        previous_status_id: 'status-2',
      };

      const mutation = await queueStatusMutation(payload);
      await deleteMutation(mutation!.id);

      const retrieved = await getMutation(mutation!.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not throw when deleting non-existent mutation', async () => {
      await expect(deleteMutation('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getAllMutations', () => {
    it('should return all mutations in the queue', async () => {
      await queueStatusMutation({
        task_id: 'task-1',
        status_id: 's1',
        previous_status_id: 's0',
      });
      await queueCommentMutation({
        task_id: 'task-2',
        content: 'comment',
        temp_id: 'temp-1',
      });

      const all = await getAllMutations();

      expect(all).toHaveLength(2);
      expect(all.map((m) => m.type)).toContain('status');
      expect(all.map((m) => m.type)).toContain('comment');
    });

    it('should return empty array when queue is empty', async () => {
      const all = await getAllMutations();

      expect(all).toEqual([]);
    });
  });

  describe('clearAllMutations', () => {
    it('should remove all mutations from the queue', async () => {
      await queueStatusMutation({
        task_id: 'task-1',
        status_id: 's1',
        previous_status_id: 's0',
      });
      await queueCommentMutation({
        task_id: 'task-2',
        content: 'comment',
        temp_id: 'temp-1',
      });

      await clearAllMutations();

      const all = await getAllMutations();
      expect(all).toHaveLength(0);
    });
  });
});
