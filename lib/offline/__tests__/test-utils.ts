import Dexie from 'dexie';
import type { TypedPendingMutation } from '../db';

/**
 * Test database that mirrors production FieldOpsDB schema
 * Used for isolated testing without singleton pollution
 */
export class TestDB extends Dexie {
  pending_mutations!: Dexie.Table<TypedPendingMutation, string>;

  constructor(name = 'test_prostreet_db') {
    super(name);

    // Match production schema version 3
    this.version(1).stores({
      pending_mutations: 'id, type, status, created_at',
    });
  }
}

let testDBInstance: TestDB | null = null;

/**
 * Create a fresh test database instance
 * Call in beforeEach to ensure isolation
 */
export function createTestDB(): TestDB {
  // Close any existing instance
  if (testDBInstance) {
    testDBInstance.close();
  }

  // Create new instance with unique name to avoid conflicts
  const dbName = `test_db_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  testDBInstance = new TestDB(dbName);
  return testDBInstance;
}

/**
 * Cleanup test database after test
 * Call in afterEach
 */
export async function cleanupTestDB(): Promise<void> {
  if (testDBInstance) {
    testDBInstance.close();
    await Dexie.delete(testDBInstance.name);
    testDBInstance = null;
  }
}

/**
 * Helper to create a mock mutation for testing
 */
export function createMockStatusMutation(
  overrides: Partial<TypedPendingMutation> = {}
): TypedPendingMutation {
  return {
    id: `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'status',
    status: 'pending',
    created_at: new Date().toISOString(),
    retry_count: 0,
    payload: {
      task_id: 'task-123',
      status_id: 'status-new',
      previous_status_id: 'status-old',
    },
    ...overrides,
  } as TypedPendingMutation;
}
