import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createTestDB, cleanupTestDB, createMockStatusMutation, type TestDB } from './test-utils';
import type { PendingStatusMutation, ConflictInfo } from '../db';

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock the mutation-queue module to use our test DB
vi.mock('../mutation-queue', () => ({
  getPendingMutations: vi.fn(),
  updateMutationStatus: vi.fn(),
  deleteMutation: vi.fn(),
  markMutationConflict: vi.fn(),
}));

// Mock the helpers module
vi.mock('../helpers', () => ({
  saveToLocal: vi.fn(),
  getFromLocal: vi.fn(),
  deleteFromLocal: vi.fn(),
}));

// Mock the monitoring/sentry module to avoid importing mutation-queue
vi.mock('@/lib/monitoring/sentry', () => ({
  trackSyncMetrics: vi.fn(),
  setSyncContext: vi.fn(),
}));

// Import mocked modules
import { createClient } from '@/lib/supabase/client';
import {
  getPendingMutations,
  updateMutationStatus,
  deleteMutation,
  markMutationConflict,
} from '../mutation-queue';
import { saveToLocal, getFromLocal } from '../helpers';

// Import the function under test (after mocks are set up)
import { processAllMutations, type SyncProgress } from '../sync-processor';

// Helper types for Supabase mock
interface MockSupabaseResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface MockSupabaseClient {
  from: Mock;
  auth: {
    getUser: Mock;
  };
  storage: {
    from: Mock;
  };
}

/**
 * Create a mock Supabase client with configurable responses
 */
function createMockSupabase(): MockSupabaseClient {
  const mockClient: MockSupabaseClient = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  };

  return mockClient;
}

/**
 * Mock a successful task fetch and update for status mutation
 */
function mockSuccessfulTaskUpdate(
  mockSupabase: MockSupabaseClient,
  currentStatusId: string,
  serverUpdatedAt: string = '2020-01-01T00:00:00Z'
) {
  // Mock the select query (conflict check)
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { status_id: currentStatusId, updated_at: serverUpdatedAt },
        error: null,
      }),
    }),
  });

  // Mock the update query
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  });

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'tasks') {
      return {
        select: selectMock,
        update: updateMock,
      };
    }
    return {};
  });

  return { selectMock, updateMock };
}

/**
 * Mock a conflict scenario where server status differs
 */
function mockConflictScenario(
  mockSupabase: MockSupabaseClient,
  serverStatusId: string,
  serverUpdatedAt: string
) {
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { status_id: serverStatusId, updated_at: serverUpdatedAt },
        error: null,
      }),
    }),
  });

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'tasks') {
      return {
        select: selectMock,
      };
    }
    return {};
  });

  return { selectMock };
}

/**
 * Mock an error scenario
 */
function mockErrorScenario(
  mockSupabase: MockSupabaseClient,
  errorMessage: string,
  errorType: 'fetch' | 'update' = 'fetch'
) {
  if (errorType === 'fetch') {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage },
        }),
      }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: selectMock,
        };
      }
      return {};
    });
  } else {
    // Update error
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { status_id: 'status-old', updated_at: '2020-01-01T00:00:00Z' },
          error: null,
        }),
      }),
    });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      }),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: selectMock,
          update: updateMock,
        };
      }
      return {};
    });
  }
}

/**
 * Mock task not found scenario
 */
function mockTaskNotFound(mockSupabase: MockSupabaseClient) {
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  });

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'tasks') {
      return {
        select: selectMock,
      };
    }
    return {};
  });
}

describe('sync-processor', () => {
  let db: TestDB;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    db = createTestDB();
    mockSupabase = createMockSupabase();
    (createClient as Mock).mockReturnValue(mockSupabase);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  describe('processAllMutations - basic processing', () => {
    it('should return synced status when no mutations exist', async () => {
      // Setup: no pending mutations
      (getPendingMutations as Mock).mockResolvedValue([]);

      const result = await processAllMutations();

      expect(result.status).toBe('synced');
      expect(result.total).toBe(0);
      expect(result.current).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.conflicts).toEqual([]);
      expect(result.lastSyncedAt).not.toBeNull();
    });

    it('should process a single mutation successfully', async () => {
      // Setup: one pending status mutation
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);

      // Mock successful task update - server has same status as previous_status_id
      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2023-12-01T00:00:00Z');

      // Mock getFromLocal for local cache update
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      const result = await processAllMutations();

      expect(result.status).toBe('synced');
      expect(result.total).toBe(1);
      expect(result.current).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.conflicts).toEqual([]);

      // Verify mutation was marked as syncing then deleted
      expect(updateMutationStatus).toHaveBeenCalledWith('mutation-1', 'syncing');
      expect(deleteMutation).toHaveBeenCalledWith('mutation-1');
    });

    it('should call progress callback during processing', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2023-12-01T00:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      const progressUpdates: SyncProgress[] = [];
      const onProgress = (progress: SyncProgress) => {
        progressUpdates.push({ ...progress });
      };

      await processAllMutations(onProgress);

      // Should have multiple progress updates:
      // 1. Initial (syncing, current: 0)
      // 2. After processing (syncing, current: 1)
      // 3. Final (synced, current: 1)
      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
      expect(progressUpdates[0].status).toBe('syncing');
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('synced');
    });

    it('should mark all mutations as syncing before batch processing starts', async () => {
      const syncingOrder: string[] = [];

      // Create mutations with explicit timestamps
      const mutation1 = createMockStatusMutation({
        id: 'mutation-oldest',
        created_at: '2024-01-01T08:00:00Z',
        payload: { task_id: 'task-1', status_id: 'status-a', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      const mutation2 = createMockStatusMutation({
        id: 'mutation-middle',
        created_at: '2024-01-01T09:00:00Z',
        payload: { task_id: 'task-2', status_id: 'status-b', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      const mutation3 = createMockStatusMutation({
        id: 'mutation-newest',
        created_at: '2024-01-01T10:00:00Z',
        payload: { task_id: 'task-3', status_id: 'status-c', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      // Return in FIFO order (oldest first) - getPendingMutations sorts by created_at
      (getPendingMutations as Mock).mockResolvedValue([mutation1, mutation2, mutation3]);

      // Track 'syncing' status calls to verify batch marking
      (updateMutationStatus as Mock).mockImplementation((id: string, status: string) => {
        if (status === 'syncing') {
          syncingOrder.push(id);
        }
        return Promise.resolve();
      });

      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2023-12-01T00:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      await processAllMutations();

      // With batch processing, all mutations are marked as syncing (order preserved from input)
      expect(syncingOrder).toEqual([
        'mutation-oldest',
        'mutation-middle',
        'mutation-newest',
      ]);
    });

    it('should transition status from pending to syncing during processing', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        status: 'pending',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2023-12-01T00:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      await processAllMutations();

      // Verify status was updated to syncing
      expect(updateMutationStatus).toHaveBeenCalledWith('mutation-1', 'syncing');
    });

    it('should process mutations concurrently (not sequentially)', async () => {
      // Create multiple mutations
      const mutations = [
        createMockStatusMutation({
          id: 'mutation-1',
          created_at: '2024-01-01T08:00:00Z',
          payload: { task_id: 'task-1', status_id: 'status-a', previous_status_id: 'status-old' },
        }),
        createMockStatusMutation({
          id: 'mutation-2',
          created_at: '2024-01-01T08:01:00Z',
          payload: { task_id: 'task-2', status_id: 'status-b', previous_status_id: 'status-old' },
        }),
        createMockStatusMutation({
          id: 'mutation-3',
          created_at: '2024-01-01T08:02:00Z',
          payload: { task_id: 'task-3', status_id: 'status-c', previous_status_id: 'status-old' },
        }),
      ] as PendingStatusMutation[];

      (getPendingMutations as Mock).mockResolvedValue(mutations);

      // Track when each mutation starts and ends processing
      const processingTimeline: { id: string; event: 'start' | 'end'; time: number }[] = [];
      let callCount = 0;

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockImplementation(async () => {
            callCount++;
            const mutationId = mutations[callCount - 1]?.id || 'unknown';
            processingTimeline.push({ id: mutationId, event: 'start', time: Date.now() });

            // Simulate network delay
            await new Promise(r => setTimeout(r, 50));

            processingTimeline.push({ id: mutationId, event: 'end', time: Date.now() });
            return {
              data: { status_id: 'status-old', updated_at: '2023-12-01T00:00:00Z' },
              error: null,
            };
          }),
        })),
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return { select: selectMock, update: updateMock };
        }
        return {};
      });

      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      await processAllMutations();

      // With concurrent processing, start events should happen before all end events
      // (i.e., mutations overlap in processing time)
      const startTimes = processingTimeline.filter(e => e.event === 'start').map(e => e.time);
      const endTimes = processingTimeline.filter(e => e.event === 'end').map(e => e.time);

      // At least some starts should happen before some ends (concurrent)
      // With sequential processing, all events would alternate: start, end, start, end...
      const lastStart = Math.max(...startTimes);
      const firstEnd = Math.min(...endTimes);

      // In concurrent processing, the last mutation should start before the first mutation ends
      expect(lastStart).toBeLessThan(firstEnd);
    });
  });

  describe('processAllMutations - conflict detection', () => {
    it('should detect conflict when server status differs from previous_status_id AND server updated after mutation', async () => {
      // Mutation created at 10:00, expects status-old
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);

      // Server has different status AND was updated AFTER mutation was created
      mockConflictScenario(mockSupabase, 'status-different', '2024-01-01T11:00:00Z');

      const result = await processAllMutations();

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].mutationId).toBe('mutation-1');
      expect(result.conflicts[0].conflict).toBeDefined();
      expect(result.conflicts[0].conflict?.server_value).toBe('status-different');
      expect(result.conflicts[0].conflict?.local_value).toBe('status-new');

      // Verify conflict was marked
      expect(markMutationConflict).toHaveBeenCalledWith(
        'mutation-1',
        expect.objectContaining({
          server_value: 'status-different',
          local_value: 'status-new',
          field_name: 'status',
        })
      );
    });

    it('should NOT detect conflict when server status matches previous_status_id', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);

      // Server has the SAME status as previous_status_id (no conflict)
      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2024-01-01T11:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      const result = await processAllMutations();

      expect(result.conflicts.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(markMutationConflict).not.toHaveBeenCalled();
    });

    it('should NOT detect conflict when server is older than mutation', async () => {
      // Mutation created at 10:00
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);

      // Server has different status but was updated BEFORE mutation was created
      // This means the mutation was made with knowledge of this server state
      mockSuccessfulTaskUpdate(mockSupabase, 'status-different', '2024-01-01T09:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-different' });

      const result = await processAllMutations();

      // No conflict because server update predates the mutation
      expect(result.conflicts.length).toBe(0);
      expect(markMutationConflict).not.toHaveBeenCalled();
    });

    it('should skip conflict check when force_overwrite is true', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        force_overwrite: true,
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);

      // Server has different status and is newer - would normally conflict
      // But force_overwrite bypasses conflict detection
      mockSuccessfulTaskUpdate(mockSupabase, 'status-different', '2024-01-01T11:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-different' });

      const result = await processAllMutations();

      expect(result.conflicts.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(markMutationConflict).not.toHaveBeenCalled();
      expect(deleteMutation).toHaveBeenCalledWith('mutation-1');
    });
  });

  describe('processAllMutations - error handling', () => {
    it('should mark mutation as failed on database fetch error', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockErrorScenario(mockSupabase, 'Database connection failed', 'fetch');

      const result = await processAllMutations();

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].mutationId).toBe('mutation-1');
      expect(result.errors[0].error).toBe('Database connection failed');

      // Verify mutation was marked as failed
      expect(updateMutationStatus).toHaveBeenCalledWith(
        'mutation-1',
        'failed',
        'Database connection failed'
      );
    });

    it('should mark mutation as failed on database update error', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockErrorScenario(mockSupabase, 'Update permission denied', 'update');

      const result = await processAllMutations();

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe('Update permission denied');

      expect(updateMutationStatus).toHaveBeenCalledWith(
        'mutation-1',
        'failed',
        'Update permission denied'
      );
    });

    it('should mark mutation as failed when task not found', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockTaskNotFound(mockSupabase);

      const result = await processAllMutations();

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe('Task not found');

      expect(updateMutationStatus).toHaveBeenCalledWith(
        'mutation-1',
        'failed',
        'Task not found'
      );
    });

    it('should continue processing after error (partial success)', async () => {
      const mutation1 = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T08:00:00Z',
        payload: { task_id: 'task-1', status_id: 'status-a', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      const mutation2 = createMockStatusMutation({
        id: 'mutation-2',
        created_at: '2024-01-01T09:00:00Z',
        payload: { task_id: 'task-2', status_id: 'status-b', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      const mutation3 = createMockStatusMutation({
        id: 'mutation-3',
        created_at: '2024-01-01T10:00:00Z',
        payload: { task_id: 'task-3', status_id: 'status-c', previous_status_id: 'status-old' },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation1, mutation2, mutation3]);

      // First mutation fails, second and third succeed
      let callCount = 0;
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'First mutation failed' },
              });
            }
            return Promise.resolve({
              data: { status_id: 'status-old', updated_at: '2023-12-01T00:00:00Z' },
              error: null,
            });
          }),
        })),
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      });

      (getFromLocal as Mock).mockResolvedValue({ id: 'task-x', status_id: 'status-old' });

      const result = await processAllMutations();

      // Should have processed all 3
      expect(result.current).toBe(3);
      expect(result.total).toBe(3);

      // 1 error, 2 successes
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].mutationId).toBe('mutation-1');

      // Partial success still counts as synced
      expect(result.status).toBe('synced');

      // Verify all were processed
      expect(updateMutationStatus).toHaveBeenCalledWith('mutation-1', 'syncing');
      expect(updateMutationStatus).toHaveBeenCalledWith('mutation-2', 'syncing');
      expect(updateMutationStatus).toHaveBeenCalledWith('mutation-3', 'syncing');
    });

    it('should set error status when all mutations fail', async () => {
      const mutation1 = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T08:00:00Z',
      }) as PendingStatusMutation;

      const mutation2 = createMockStatusMutation({
        id: 'mutation-2',
        created_at: '2024-01-01T09:00:00Z',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation1, mutation2]);

      // All mutations fail
      mockErrorScenario(mockSupabase, 'Database unavailable', 'fetch');

      const result = await processAllMutations();

      expect(result.errors.length).toBe(2);
      expect(result.status).toBe('error');
    });
  });

  describe('processAllMutations - progress tracking', () => {
    it('should track errors in progress', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockErrorScenario(mockSupabase, 'Database error', 'fetch');

      const progressUpdates: SyncProgress[] = [];
      const onProgress = (progress: SyncProgress) => {
        progressUpdates.push({ ...progress });
      };

      await processAllMutations(onProgress);

      // Final progress should show the error
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.errors.length).toBe(1);
      expect(finalProgress.errors[0].mutationId).toBe('mutation-1');
    });

    it('should track conflicts in progress', async () => {
      const mutation = createMockStatusMutation({
        id: 'mutation-1',
        created_at: '2024-01-01T10:00:00Z',
        payload: {
          task_id: 'task-1',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation]);
      mockConflictScenario(mockSupabase, 'status-different', '2024-01-01T11:00:00Z');

      const progressUpdates: SyncProgress[] = [];
      const onProgress = (progress: SyncProgress) => {
        progressUpdates.push({ ...progress });
      };

      await processAllMutations(onProgress);

      // Final progress should show the conflict
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.conflicts.length).toBe(1);
      expect(finalProgress.conflicts[0].mutationId).toBe('mutation-1');
    });

    it('should track mixed errors and conflicts in progress', async () => {
      const mutation1 = createMockStatusMutation({
        id: 'mutation-error',
        created_at: '2024-01-01T08:00:00Z',
      }) as PendingStatusMutation;

      const mutation2 = createMockStatusMutation({
        id: 'mutation-conflict',
        created_at: '2024-01-01T09:00:00Z',
        payload: {
          task_id: 'task-2',
          status_id: 'status-new',
          previous_status_id: 'status-old',
        },
      }) as PendingStatusMutation;

      (getPendingMutations as Mock).mockResolvedValue([mutation1, mutation2]);

      // First: error, Second: conflict
      let callCount = 0;
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'Network error' },
              });
            }
            return Promise.resolve({
              data: { status_id: 'status-different', updated_at: '2024-01-01T10:00:00Z' },
              error: null,
            });
          }),
        })),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return { select: selectMock };
        }
        return {};
      });

      const result = await processAllMutations();

      expect(result.errors.length).toBe(1);
      expect(result.conflicts.length).toBe(1);
      expect(result.errors[0].mutationId).toBe('mutation-error');
      expect(result.conflicts[0].mutationId).toBe('mutation-conflict');
    });
  });
});
