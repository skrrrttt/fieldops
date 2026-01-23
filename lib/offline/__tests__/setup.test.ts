import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDB, cleanupTestDB, createMockStatusMutation } from './test-utils';

describe('test setup', () => {
  let db: ReturnType<typeof createTestDB>;

  beforeEach(() => {
    db = createTestDB();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  it('should create isolated database', async () => {
    const mutation = createMockStatusMutation();
    await db.pending_mutations.add(mutation);

    const count = await db.pending_mutations.count();
    expect(count).toBe(1);
  });

  it('should have fresh database per test', async () => {
    // This test runs after the previous one
    // If isolation works, count should be 0 (not 1)
    const count = await db.pending_mutations.count();
    expect(count).toBe(0);
  });
});
