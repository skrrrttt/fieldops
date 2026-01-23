# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Field crews can work offline without losing data, and the code is maintainable enough to evolve confidently
**Current focus:** Phase 3 - Batch Sync

## Current Position

Phase: 3 of 5 (Batch Sync)
Plan: 0 of 1 in current phase
Status: Ready to plan
Last activity: 2026-01-23 — Completed Phase 2 (Monitoring)

Progress: [████████░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 3.3 min
- Total execution time: 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-testing-foundation | 4 | 13 min | 3.3 min |
| 02-monitoring | 2 | 7 min | 3.5 min |

**Recent Trend:**
- Last 5 plans: 01-03 (3 min), 01-04 (6 min), 02-01 (4 min), 02-02 (3 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- Sentry requires user to configure environment variables (DSN, auth token, org, project)

## Session Continuity

Last session: 2026-01-23T23:20:44Z
Stopped at: Completed 02-02-PLAN.md (Sync context and metrics)
Resume file: None
