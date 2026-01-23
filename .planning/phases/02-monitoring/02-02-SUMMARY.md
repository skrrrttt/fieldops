---
phase: 02-monitoring
plan: 02
subsystem: monitoring
tags: [sentry, metrics, offline-sync, error-tracking, user-attribution]

# Dependency graph
requires:
  - phase: 02-01
    provides: Sentry SDK initialization, error boundaries, breadcrumbs
provides:
  - Sentry helper functions for sync context and user attribution
  - Sync metrics (success/failure/conflict counts) emitted after each sync
  - Automatic sync context updates on network status changes
affects: [03-ux-improvements, 04-performance, 05-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sentry context enrichment (setSyncContext with isOnline, pendingMutationCount, lastSyncTime)"
    - "Sentry metrics counters (sync.success_count, sync.failure_count, sync.conflict_count)"
    - "User attribution pattern (setSentryUser on login, clearSentryUser on logout)"
    - "Network change listener pattern (updateSyncContextOnNetworkChange)"

key-files:
  created:
    - lib/monitoring/sentry.ts
  modified:
    - lib/offline/sync-processor.ts
    - lib/offline/__tests__/sync-processor.test.ts
    - app/login/page.tsx
    - components/auth/logout-button.tsx

key-decisions:
  - "Sentry.metrics.count over increment (matches current SDK API)"
  - "Mock monitoring/sentry in sync-processor tests to avoid transitive mutation-queue dependency"

patterns-established:
  - "setSyncContext() for enriching errors with offline state"
  - "trackSyncMetrics() for emitting sync operation metrics"
  - "User context lifecycle: set on login, clear on logout"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 2 Plan 02: Sync Context and Metrics Summary

**Sentry sync context enrichment (isOnline, pendingMutationCount, lastSyncTime) with counter metrics for sync operations and user attribution on login/logout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T23:17:56Z
- **Completed:** 2026-01-23T23:20:44Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created Sentry helper module with context, metrics, and user attribution functions
- Integrated sync metrics into processAllMutations for automatic tracking
- Wired user context to login and logout flows for error attribution
- Added network change listener for automatic sync context updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Sentry helper module** - `d67a528d` (feat)
2. **Task 2: Integrate metrics into sync processor** - `b9d9bd14` (feat)
3. **Task 3: Wire user context to login and logout** - `055cfdeb` (feat)

## Files Created/Modified

- `lib/monitoring/sentry.ts` - Sentry helper functions (setSyncContext, setSentryUser, clearSentryUser, trackSyncMetrics, updateSyncContextOnNetworkChange)
- `lib/offline/sync-processor.ts` - Added metrics and context tracking after sync completion
- `lib/offline/__tests__/sync-processor.test.ts` - Added sentry mock for test isolation
- `app/login/page.tsx` - Set Sentry user and sync context after successful login
- `components/auth/logout-button.tsx` - Clear Sentry user on logout

## Decisions Made

1. **Sentry.metrics.count over increment:** The current Sentry SDK uses `count()` method, not `increment()`. Fixed based on SDK type definitions.

2. **Mock monitoring/sentry in tests:** The sentry module imports from mutation-queue, which is mocked in sync-processor tests. Added explicit sentry mock to avoid transitive dependency issues and unhandled promise rejections.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Sentry metrics API usage**
- **Found during:** Task 1 (Create Sentry helper module)
- **Issue:** Plan specified `Sentry.metrics.increment()` but SDK uses `Sentry.metrics.count()`
- **Fix:** Changed to use `Sentry.metrics.count()` which is the correct API
- **Files modified:** lib/monitoring/sentry.ts
- **Verification:** npm run typecheck passes
- **Committed in:** d67a528d (Task 1 commit)

**2. [Rule 3 - Blocking] Added sentry mock to sync-processor tests**
- **Found during:** Task 2 (Integrate metrics into sync processor)
- **Issue:** Tests had unhandled promise rejections because sentry module imports from mutation-queue which is mocked
- **Fix:** Added vi.mock for @/lib/monitoring/sentry in sync-processor.test.ts
- **Files modified:** lib/offline/__tests__/sync-processor.test.ts
- **Verification:** npm test passes with no unhandled errors
- **Committed in:** b9d9bd14 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes essential for correctness. No scope creep.

## Issues Encountered

None - execution proceeded smoothly after auto-fixes.

## User Setup Required

None - no external service configuration required. Sentry SDK was configured in phase 02-01.

## Next Phase Readiness

- Monitoring infrastructure complete with SDK integration (02-01) and context/metrics (02-02)
- Errors will now include full sync context for debugging
- Sync metrics available for health monitoring
- Ready to proceed to Phase 3 (UX Improvements)

---
*Phase: 02-monitoring*
*Completed: 2026-01-23*
