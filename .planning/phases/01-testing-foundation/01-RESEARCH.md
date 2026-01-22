# Phase 1: Testing Foundation - Research

**Researched:** 2026-01-22
**Domain:** Vitest + fake-indexeddb testing for Dexie.js offline sync layer
**Confidence:** HIGH

## Summary

This phase establishes testing infrastructure for the `lib/offline/` module and fixes specific bugs. The codebase has a well-structured offline sync layer with clear separation of concerns:

1. **db.ts** - Dexie schema and types (well-typed, minimal changes needed)
2. **mutation-queue.ts** - CRUD operations for pending mutations (testable, one bug found)
3. **sync-processor.ts** - Sequential FIFO processing with conflict detection (testable)
4. **helpers.ts** - Generic table accessors (has 10 `any` casts that need fixing)

**Primary recommendation:** Focus on unit tests for pure business logic (mutation-queue.ts, sync-processor.ts), fix the `clearSyncedMutations()` bug, and eliminate type-unsafe patterns in helpers.ts.

---

## Current State Analysis

### File Structure

```
lib/offline/
├── db.ts                  # Dexie schema, types, singleton - 337 lines
├── mutation-queue.ts      # Queue CRUD operations - 430 lines
├── sync-processor.ts      # Sync processing logic - 457 lines
├── helpers.ts             # Generic table accessors - 269 lines
├── index.ts               # Exports - 131 lines
├── use-background-sync.ts # React hook for sync - 192 lines
├── use-offline-sync.ts    # React hook for offline state
├── use-task-offline.ts    # React hook for task operations
└── use-manual-refresh.ts  # React hook for manual refresh
```

### Test Infrastructure Status

- **No tests exist** - No `.test.ts` files in the project
- **No Vitest config** - No `vitest.config.ts` found
- **No test scripts** - `package.json` has no `test` script
- **Dependencies missing** - Vitest, fake-indexeddb, testing libraries not installed

### Key Dependencies

| Dependency | Current Version | Purpose |
|------------|-----------------|---------|
| dexie | ^4.2.1 | IndexedDB wrapper |
| next | 16.1.1 | Framework |
| react | 19.2.3 | UI library |
| typescript | ^5 | Type checking |

---

## Files to Test

### 1. mutation-queue.ts - Core Queue Operations

**Functions to test:**

| Function | Testable Behavior | Priority |
|----------|-------------------|----------|
| `queueStatusMutation()` | Creates mutation with correct structure, auto-generates ID, sets `pending` status, sets `retry_count: 0` | HIGH |
| `queueCommentMutation()` | Same as above for comment type | HIGH |
| `queuePhotoMutation()` | Same as above, handles Blob payload | HIGH |
| `queueFileMutation()` | Same as above for file type | MEDIUM |
| `getPendingMutations()` | Returns FIFO order (sorted by `created_at`), filters by `pending` status only | HIGH |
| `getAllMutations()` | Returns all mutations regardless of status, FIFO order | MEDIUM |
| `getMutationsByStatus()` | Correct status filtering | MEDIUM |
| `updateMutationStatus()` | Status transitions, `retry_count` increments on `failed` | HIGH |
| `deleteMutation()` | Removes from queue | MEDIUM |
| `clearSyncedMutations()` | **BUG: Currently does nothing** | HIGH |
| `resetFailedMutations()` | Resets `failed` to `pending`, clears `error_message` | MEDIUM |
| `markMutationConflict()` | Sets `conflict` status and `ConflictInfo` | HIGH |
| `resolveConflict()` | Local: sets `force_overwrite`, Server: deletes mutation | HIGH |
| `getMutationsSummary()` | Correct counts by status and type | MEDIUM |

**Test scenarios for FIFO ordering:**
```typescript
// Queue mutations with different timestamps
await queueStatusMutation({ ... }); // created_at: T1
await queueStatusMutation({ ... }); // created_at: T2
await queueStatusMutation({ ... }); // created_at: T3

const pending = await getPendingMutations();
// Should be [T1, T2, T3] - FIFO order
```

**Test scenarios for retry count:**
```typescript
const mutation = await queueStatusMutation({ ... });
expect(mutation.retry_count).toBe(0);

await updateMutationStatus(mutation.id, 'failed', 'Network error');
const updated = await getMutation(mutation.id);
expect(updated.retry_count).toBe(1);
expect(updated.error_message).toBe('Network error');

// Second failure
await updateMutationStatus(mutation.id, 'failed', 'Timeout');
const updated2 = await getMutation(mutation.id);
expect(updated2.retry_count).toBe(2);
```

### 2. sync-processor.ts - Processing Logic

**Functions to test:**

| Function | Testable Behavior | Priority |
|----------|-------------------|----------|
| `processAllMutations()` | FIFO processing order, status transitions, progress callback | HIGH |
| Internal: status transition flow | pending -> syncing -> (synced/failed/conflict) | HIGH |
| Conflict detection logic | Detects when server differs from `previous_status_id` | HIGH |
| `force_overwrite` bypass | Skips conflict check when flag is set | MEDIUM |

**Note:** Testing `sync-processor.ts` requires mocking Supabase client. The processor functions import `createClient` from `@/lib/supabase/client`.

**Test scenarios for sequential processing:**
```typescript
// Queue 3 mutations
const m1 = await queueStatusMutation({ ... });
const m2 = await queueCommentMutation({ ... });
const m3 = await queuePhotoMutation({ ... });

const processOrder: string[] = [];
// Mock processMutation to track order
// ...

await processAllMutations();
expect(processOrder).toEqual([m1.id, m2.id, m3.id]);
```

**Test scenarios for conflict detection:**
```typescript
// Scenario: Server status changed since mutation was created
// mutation.payload.previous_status_id = 'status-1'
// server.status_id = 'status-2' (different)
// server.updated_at > mutation.created_at

// Expected: conflict detected, mutation marked with ConflictInfo
```

### 3. helpers.ts - Type-Safe Accessors

**Current state:** All generic table operations use `as any` casts:
- Line 44: `(db[tableName] as any).put(data)`
- Line 59: `(db[tableName] as any).bulkPut(items)`
- Line 77: `(db[tableName] as any).get(id)`
- Line 90: `(db[tableName] as any).toArray()`
- Line 105: `(db[tableName] as any).where(indexName).equals(value).toArray()`
- Line 119: `(db[tableName] as any).delete(id)`
- Line 133: `(db[tableName] as any).bulkDelete(ids)`
- Line 144: `(db[tableName] as any).clear()`
- Line 174: `(db[tableName] as any).count()`

**Testing approach:** After type fixes, tests should verify operations work without runtime errors.

---

## Type Safety Gaps

### Location 1: helpers.ts - Generic Table Operations

**Problem:** Dynamic table access requires `any` because TypeScript can't narrow the union type.

```typescript
// Current (unsafe)
export async function saveToLocal<T extends TableName>(
  tableName: T,
  data: TableDataMap[T]
): Promise<void> {
  const db = getDB();
  await (db[tableName] as any).put(data); // any cast
}
```

**Solution approach:** Use function overloads or type assertion with proper constraints.

```typescript
// Option 1: Overloads for each table (verbose but type-safe)
export async function saveToLocal(tableName: 'tasks', data: LocalTask): Promise<void>;
export async function saveToLocal(tableName: 'comments', data: LocalComment): Promise<void>;
// ... etc

// Option 2: Runtime assertion with type guard
type TableRecord<T extends TableName> = T extends 'tasks' ? LocalTask : ...;
```

### Location 2: mutation-queue.ts - resolveConflict()

**Line 411:** `force_overwrite: true as any`

```typescript
await db.pending_mutations.update(mutationId, {
  status: 'pending',
  conflict: undefined,
  force_overwrite: true as any, // Casting because force_overwrite isn't in base PendingMutation
});
```

**Problem:** The `force_overwrite` field exists on `PendingMutation` interface but the update partial doesn't recognize it.

**Solution:** Properly type the update partial or extend the type.

### Location 3: sync-processor.ts - registerBackgroundSync()

**Line 425:** `(registration as any).sync.register(tag)`

```typescript
const registration = await navigator.serviceWorker.ready;
await (registration as any).sync.register(tag);
```

**Problem:** TypeScript doesn't know about the `sync` property on `ServiceWorkerRegistration` (Background Sync API).

**Solution:** Extend the type declaration or use a type assertion with proper interface.

---

## Bug Analysis: clearSyncedMutations()

### Location
`/Users/luke/Desktop/testcodd/lib/offline/mutation-queue.ts` - Lines 224-233

### Current Implementation (Broken)

```typescript
export async function clearSyncedMutations(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  // Note: We don't have a 'synced' status, but this clears mutations
  // that were marked for deletion after successful sync
  const db = getDB();
  const synced = await db.pending_mutations.toArray();
  // Filter out any that should be removed (handled by processMutation)
  await Promise.resolve(synced);
}
```

### Analysis

1. **Does nothing:** The function fetches all mutations into `synced`, then awaits a resolved promise with that array. No deletion occurs.
2. **Comment is misleading:** Says "We don't have a 'synced' status" - this is correct, successful mutations are deleted immediately by `processMutation()` via `deleteMutation()`.
3. **Function purpose unclear:** Based on the name, it should delete completed mutations, but the current sync flow already handles this.

### Sync Flow Analysis

In `sync-processor.ts` `processAllMutations()`:
```typescript
if (result.success) {
  // Remove from queue on success
  await deleteMutation(mutation.id);
}
```

Successful mutations are deleted **immediately** after sync. There's no "synced" status - the mutation disappears from the queue.

### Possible Intent

The function might have been intended for:
1. **Batch cleanup:** Delete any orphaned "synced" mutations if the status existed
2. **Future use:** Placeholder for a deferred deletion strategy
3. **Recovery:** Clean up mutations that somehow got stuck

### Recommended Fix

Option A: **Remove the function** if it serves no purpose (current sync flow handles deletion)

Option B: **Implement actual cleanup** of any mutations that shouldn't be in the queue:
```typescript
export async function clearSyncedMutations(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  // Delete any mutations that are not in an active state
  // (This would only be needed if a "synced" status existed)
  // Since we delete on success, this is essentially a no-op
  // Unless we want to clean up old failed/conflict mutations
}
```

Option C: **Add 'synced' status and batch delete** (bigger change):
```typescript
// 1. Change processAllMutations to mark as 'synced' instead of deleting
// 2. clearSyncedMutations() then does batch delete
export async function clearSyncedMutations(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();
  await db.pending_mutations.where('status').equals('synced').delete();
}
```

**Recommendation:** Implement Option C for the success criteria requirement. Add a `synced` status to `MutationStatus`, mark successful mutations as `synced` instead of deleting immediately, then `clearSyncedMutations()` performs batch deletion. This is cleaner and more auditable.

---

## Implementation Recommendations

### Test File Organization

```
lib/offline/
├── __tests__/
│   ├── mutation-queue.test.ts    # Queue CRUD, FIFO, retry count
│   ├── sync-processor.test.ts    # Processing logic, conflicts
│   ├── helpers.test.ts           # Type-safe operations
│   └── test-utils.ts             # Shared test setup, mocks
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.ts', 'components/**/*.test.ts'],
  },
});
```

### Test Setup with Isolation

```typescript
// vitest.setup.ts
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, afterEach } from 'vitest';

// Critical: Reset IndexedDB for each test to prevent cross-test pollution
beforeEach(() => {
  // Create fresh IndexedDB instance
  indexedDB = new IDBFactory();
});

// Clean up after each test
afterEach(() => {
  // Additional cleanup if needed
});
```

### Mocking Strategy for sync-processor.ts

The sync processor imports Supabase client and makes HTTP calls. Tests should:

1. **Mock the Supabase client module** to return controlled responses
2. **Test conflict detection logic** with different server states
3. **Verify status transitions** occur in correct order

```typescript
// In test file
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { status_id: 'status-1', updated_at: '2024-01-01T00:00:00Z' },
            error: null
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } })
    }
  })
}));
```

### Type Safety Improvements

For `helpers.ts`, consider a type-safe wrapper pattern:

```typescript
// Approach: Use mapped types with explicit table access
async function saveToLocal<T extends TableName>(
  tableName: T,
  data: TableDataMap[T]
): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  const db = getDB();

  // Type-safe access using explicit table methods
  switch (tableName) {
    case 'tasks':
      await db.tasks.put(data as LocalTask);
      break;
    case 'comments':
      await db.comments.put(data as LocalComment);
      break;
    // ... other tables
  }
}
```

This eliminates `any` casts while maintaining type safety.

---

## Test Priority Order

1. **mutation-queue.test.ts** (First)
   - Pure business logic, no external dependencies
   - Tests FIFO ordering, retry count incrementing, status transitions
   - Tests the `clearSyncedMutations()` fix

2. **sync-processor.test.ts** (Second)
   - Requires Supabase mocking
   - Tests sequential processing, conflict detection
   - Tests status transition flow

3. **helpers.test.ts** (Third)
   - Tests type-safe table operations
   - Verifies refactored code works correctly

---

## Open Questions

1. **Should `clearSyncedMutations()` be removed or fixed?**
   - Current sync flow deletes on success immediately
   - Adding `synced` status would change the deletion strategy
   - Recommendation: Add `synced` status for cleaner audit trail

2. **How to handle liveQuery in tests?**
   - React hooks using `useLiveQuery` need special handling
   - Recommendation: Mock the hooks for component tests, test business logic directly

---

## Dependencies to Install

```bash
# Core testing
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths

# React testing (for future component tests)
npm install -D @testing-library/react @testing-library/dom jsdom

# IndexedDB testing
npm install -D fake-indexeddb
```

---

## Metadata

**Confidence breakdown:**
- Codebase analysis: HIGH - Full code review completed
- Test strategy: HIGH - Standard Vitest + fake-indexeddb patterns
- Bug analysis: HIGH - clearSyncedMutations clearly does nothing
- Type safety fixes: MEDIUM - Multiple valid approaches, needs implementation verification

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable testing patterns)
