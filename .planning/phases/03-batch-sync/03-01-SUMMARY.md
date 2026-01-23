---
phase: 03-batch-sync
plan: 01
subsystem: offline
tags: [p-limit, batch-processing, rate-limiting, concurrency, sync]

# Dependency graph
requires:
  - phase: 01-testing-foundation
    provides: Vitest test infrastructure, sync-processor tests
  - phase: 02-monitoring
    provides: Sentry metrics integration in sync-processor
provides:
  - Parallel batch mutation processing with p-limit
  - Exponential backoff with bounded jitter for rate limits
  - Configurable concurrency limits (5 for data, 2 for files)
affects: [04-priority-queue, 05-conflict-resolution]

# Tech tracking
tech-stack:
  added: [p-limit]
  patterns: [batch-processing-with-rate-limit, exponential-backoff-with-jitter]

key-files:
  created:
    - lib/offline/backoff.ts
    - lib/offline/batch-processor.ts
  modified:
    - lib/offline/sync-processor.ts
    - lib/offline/__tests__/sync-processor.test.ts
    - package.json

key-decisions:
  - "DATA_CONCURRENCY=5 for status/comment mutations"
  - "FILE_CONCURRENCY=2 for photo/file mutations (larger payloads)"
  - "MAX_RATE_LIMIT_RETRIES=5 before giving up"
  - "Bounded jitter +/- 25% to prevent thundering herd"

patterns-established:
  - "processBatchWithRateLimit: Separate data/file mutations for different concurrency"
  - "Promise.allSettled for independent failure handling in batches"
  - "calculateBackoff with exponential growth and bounded jitter"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 3 Plan 01: Batch Sync Summary

**Parallel batch mutation processing with p-limit concurrency control and exponential backoff for rate limits**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T16:49:00Z
- **Completed:** 2026-01-23T16:53:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created backoff.ts with calculateBackoff (exponential + bounded jitter) and isRateLimitError detection
- Created batch-processor.ts with p-limit concurrency control (DATA=5, FILE=2)
- Refactored sync-processor to use parallel batch processing instead of sequential FIFO
- Added concurrent processing test verifying mutations overlap in processing time
- All 81 tests pass with batched implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backoff and batch processor modules** - `27854955` (feat)
2. **Task 2: Refactor sync-processor to use batch processing** - `1405909d` (feat)
3. **Task 3: Update sync-processor tests for batched behavior** - `b056f58d` (test)

## Files Created/Modified

- `lib/offline/backoff.ts` - Exponential backoff calculation with bounded jitter
- `lib/offline/batch-processor.ts` - Batch processing with p-limit concurrency control
- `lib/offline/sync-processor.ts` - Refactored to use processBatchWithRateLimit
- `lib/offline/__tests__/sync-processor.test.ts` - Updated tests for batch behavior
- `package.json` - Added p-limit dependency

## Decisions Made

- **DATA_CONCURRENCY=5**: Status and comment mutations are small, can handle higher concurrency
- **FILE_CONCURRENCY=2**: Photo and file mutations have larger payloads, stricter rate limits
- **Bounded jitter +/- 25%**: Prevents thundering herd when multiple clients retry simultaneously
- **Promise.allSettled**: One mutation failure doesn't abort the entire batch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Batch sync foundation complete with rate limit protection
- Ready for Phase 4 (Priority Queue) to add mutation prioritization
- Ready for Phase 5 (Conflict Resolution) to enhance conflict handling UI

---
*Phase: 03-batch-sync*
*Completed: 2026-01-23*
