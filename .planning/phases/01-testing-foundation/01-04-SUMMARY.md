---
phase: 01-testing-foundation
plan: 04
subsystem: offline
tags: [dexie, indexeddb, typescript, type-safety]

# Dependency graph
requires:
  - phase: 01-01
    provides: Test infrastructure with fake-indexeddb
provides:
  - Type-safe helpers for IndexedDB operations without any casts
  - Working clearSyncedMutations() function
  - MutationStatus type includes 'synced' status
  - Tests for helpers and clearSyncedMutations
affects: [02-offline-sync, 03-conflict-resolution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Switch/case pattern for type-safe generic table access"
    - "Await-then-cast pattern for Dexie PromiseExtended return types"

key-files:
  created:
    - lib/offline/__tests__/helpers.test.ts
  modified:
    - lib/offline/helpers.ts
    - lib/offline/mutation-queue.ts
    - lib/offline/db.ts
    - lib/offline/sync-processor.ts
    - lib/offline/use-background-sync.ts
    - lib/offline/index.ts

key-decisions:
  - "Switch/case over dynamic property access for type-safe table operations"
  - "Remove unused getFilteredFromLocal function (cannot be made type-safe)"
  - "Mark as synced before deletion in sync processor for batch cleanup support"

patterns-established:
  - "Type-safe table operations: Use switch/case instead of (db[tableName] as any)"
  - "Dexie return handling: await then cast for Promise types"

# Metrics
duration: 6min
completed: 2026-01-23
---

# Phase 1 Plan 4: Offline Type Safety Summary

**Type-safe Dexie helpers using switch/case pattern, working clearSyncedMutations() with synced status tracking**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-23T22:10:27Z
- **Completed:** 2026-01-23T22:15:56Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Eliminated all `any` casts from helpers.ts using switch/case pattern
- Added 'synced' status to MutationStatus type for proper mutation lifecycle
- Fixed clearSyncedMutations() to actually delete synced mutations and return count
- Added 19 tests for type-safe helpers and clearSyncedMutations
- Updated sync processor to mark mutations as 'synced' before deletion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add synced status and fix clearSyncedMutations** - `bb7b49ac` (feat)
2. **Task 2: Eliminate any casts in helpers.ts** - `98e7b142` (refactor)
3. **Task 3: Create tests for helpers and clearSyncedMutations** - `d957a1c8` (test)

## Files Created/Modified

- `lib/offline/__tests__/helpers.test.ts` - New: 19 tests for type-safe helpers and clearSyncedMutations
- `lib/offline/helpers.ts` - Refactored: switch/case pattern, removed getFilteredFromLocal
- `lib/offline/mutation-queue.ts` - Fixed: clearSyncedMutations, added synced to MutationsSummary
- `lib/offline/db.ts` - Added: 'synced' to MutationStatus type
- `lib/offline/sync-processor.ts` - Updated: mark as synced before deletion
- `lib/offline/use-background-sync.ts` - Updated: synced in initial summary state
- `lib/offline/index.ts` - Removed: getFilteredFromLocal export

## Decisions Made

1. **Switch/case pattern for type safety** - TypeScript cannot safely infer types with dynamic property access like `db[tableName]`. The switch/case pattern gives full type safety at the cost of verbosity. Each case explicitly accesses the correct typed table.

2. **Removed getFilteredFromLocal** - This function accepted arbitrary index names and values, making type-safe implementation impossible. It was unused in the codebase.

3. **Mark as synced before deletion** - Changed sync processor to set 'synced' status before deleting. This supports batch cleanup via clearSyncedMutations() and provides proper mutation lifecycle tracking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed use-background-sync.ts initial state**
- **Found during:** Task 1 (Add synced status)
- **Issue:** After adding 'synced' to MutationsSummary, typecheck failed in use-background-sync.ts
- **Fix:** Added synced: 0 to initial useState value
- **Files modified:** lib/offline/use-background-sync.ts
- **Verification:** npm run typecheck passes
- **Committed in:** bb7b49ac (Task 1 commit)

**2. [Rule 3 - Blocking] Removed getFilteredFromLocal from index.ts**
- **Found during:** Task 2 (Eliminate any casts)
- **Issue:** After removing getFilteredFromLocal from helpers.ts, index.ts export failed
- **Fix:** Removed the export from index.ts
- **Files modified:** lib/offline/index.ts
- **Verification:** npm run typecheck passes
- **Committed in:** 98e7b142 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both blocking)
**Impact on plan:** Both auto-fixes necessary to maintain compilation. No scope creep.

## Issues Encountered

None - plan executed as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Type-safe helpers ready for use throughout offline layer
- clearSyncedMutations() can be used for periodic cleanup of processed mutations
- Test patterns established for testing IndexedDB operations with mock database

---
*Phase: 01-testing-foundation*
*Completed: 2026-01-23*
