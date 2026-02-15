# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Field crews can work offline without losing data, and the code is maintainable enough to evolve confidently
**Current focus:** Phase 4 - Web Worker

## Current Position

Phase: 4 of 5 (Web Worker)
Plan: 1 of 2 in current phase
Status: Executing
Last activity: 2026-02-15 — Completed 04-01-PLAN.md (Web Worker photo processing)

Progress: [██████████████░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 3.3 min
- Total execution time: 26 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-testing-foundation | 4 | 13 min | 3.3 min |
| 02-monitoring | 2 | 7 min | 3.5 min |
| 03-batch-sync | 1 | 4 min | 4.0 min |
| 04-web-worker | 1 | 2 min | 2.0 min |

**Recent Trend:**
- Last 5 plans: 02-01 (4 min), 02-02 (3 min), 03-01 (4 min), 04-01 (2 min)
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Vitest over Jest (2-10x faster, native ESM, Next.js recommended)
- [Init]: fake-indexeddb v6.x required for Node 18+ structuredClone support
- [01-01]: @vitejs/plugin-react over SWC for better compatibility
- [01-01]: Fresh IDBFactory per test in vitest.setup.ts for isolation
- [01-01]: TestDB uses unique random names to avoid Dexie singleton conflicts
- [01-02]: Mock getDB() instead of modifying production code for testability
- [01-02]: Create MutationQueueTestDB class with unique names per test
- [01-03]: Mock Supabase client at module level using vi.mock for isolation
- [01-03]: Create helper functions for reusable test scenarios (success, conflict, error)
- [01-04]: Switch/case pattern for type-safe generic table access
- [01-04]: Remove unused getFilteredFromLocal (cannot be made type-safe)
- [02-01]: Type assertion for transportOptions to enable Sentry offline transport options
- [02-01]: Breadcrumb filtering keeps only error/warning console messages
- [02-01]: 10% sample rate production, 100% development for Web Vitals
- [02-02]: Sentry.metrics.count over increment (matches current SDK API)
- [02-02]: Mock monitoring/sentry in sync-processor tests for isolation
- [03-01]: DATA_CONCURRENCY=5 for status/comment, FILE_CONCURRENCY=2 for photo/file
- [03-01]: Bounded jitter +/- 25% prevents thundering herd on rate limit retry
- [03-01]: Promise.allSettled for independent batch failure handling
- [04-01]: ArrayBuffer-based API instead of File for worker transferability
- [04-01]: OffscreenCanvas detection locked once per session for consistency
- [04-01]: Worker crash permanently marks _workerFailed=true for session fallback
- [04-01]: Watermark failure returns compressed photo; compression failure returns original

### Pending Todos

None yet.

### Blockers/Concerns

- Sentry requires user to configure environment variables (DSN, auth token, org, project)

## Session Continuity

Last session: 2026-02-15T03:10:01Z
Stopped at: Completed 04-01-PLAN.md (Web Worker photo processing)
Resume file: None
