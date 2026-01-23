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

    it('should process mutations in FIFO order (oldest first)', async () => {
      const processOrder: string[] = [];

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

      // Track processing order via updateMutationStatus calls - only track 'syncing' status
      (updateMutationStatus as Mock).mockImplementation((id: string, status: string) => {
        if (status === 'syncing') {
          processOrder.push(id);
        }
        return Promise.resolve();
      });

      mockSuccessfulTaskUpdate(mockSupabase, 'status-old', '2023-12-01T00:00:00Z');
      (getFromLocal as Mock).mockResolvedValue({ id: 'task-1', status_id: 'status-old' });

      await processAllMutations();

      // Verify FIFO order: oldest processed first
      expect(processOrder).toEqual([
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
  });
});
