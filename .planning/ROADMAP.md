# Roadmap: ProStreet Quality Milestone

## Overview

This quality milestone hardens the ProStreet offline-first PWA before adding new features. The five phases establish test coverage on the mutation queue (highest data loss risk), add production monitoring for visibility, optimize sync performance with batch processing and Web Workers, then document the architecture for maintainability. Each phase builds on the previous: tests enable safe refactoring, monitoring validates optimizations, and documentation captures the refined architecture.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Testing Foundation** - Unit tests for mutation queue and sync processor with Vitest + fake-indexeddb
- [x] **Phase 2: Monitoring** - Sentry error tracking with offline transport, Core Web Vitals, sync metrics
- [ ] **Phase 3: Batch Sync** - Parallel mutation processing with rate limiting
- [ ] **Phase 4: Web Worker** - Photo processing in Web Worker for responsive UI
- [ ] **Phase 5: Documentation** - Mutation lifecycle state machine and conflict resolution flow

## Phase Details

### Phase 1: Testing Foundation
**Goal**: Developers can safely refactor the offline sync layer because comprehensive tests catch regressions
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, QUAL-01, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Running `npm test` executes Vitest tests with TypeScript and Next.js support
  2. Mutation queue tests verify FIFO ordering, add/update/delete operations, and retry count incrementing
  3. Sync processor tests verify sequential processing, conflict detection, and status transitions
  4. Each test file uses isolated IndexedDB (no cross-test state pollution)
  5. Dexie operations in `lib/offline/` use typed table accessors (no `any` casts)
  6. `clearSyncedMutations()` deletes completed mutations from IndexedDB
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Vitest configuration with fake-indexeddb
- [x] 01-02-PLAN.md — Mutation queue unit tests (FIFO, retry count, CRUD)
- [x] 01-03-PLAN.md — Sync processor unit tests (conflict detection, status transitions)
- [x] 01-04-PLAN.md — Type-safe Dexie helpers and clearSyncedMutations fix

### Phase 2: Monitoring
**Goal**: Developers have visibility into production sync behavior and errors, even when users are offline
**Depends on**: Phase 1 (need stable code before adding instrumentation)
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):
  1. Errors captured during offline operation appear in Sentry after user comes online
  2. Core Web Vitals (LCP, INP, CLS) are reported to analytics
  3. Sync metrics (success count, failure count, conflict count) are tracked per sync run
  4. Error reports include offline status and pending mutation count as context
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Sentry SDK setup with offline transport and Web Vitals
- [x] 02-02-PLAN.md — Sync metrics tracking and user context integration

### Phase 3: Batch Sync
**Goal**: Sync completes faster by processing mutations in parallel batches instead of one-by-one
**Depends on**: Phase 2 (need monitoring baseline before optimizing)
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. Multiple mutations sync concurrently (observable via network tab or logs)
  2. Batch size is configurable (default: 5 for data mutations, 2 for photos)
  3. Rate limit errors (429) trigger exponential backoff with jitter before retry
  4. Sync processor tests pass with batched implementation
**Plans**: TBD

Plans:
- [ ] 03-01: Batch sync processor with rate limiting

### Phase 4: Web Worker
**Goal**: Photo uploads do not freeze the UI during compression and watermarking
**Depends on**: Phase 1 (need tests before refactoring photo processing)
**Requirements**: PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Photo compression runs in a Web Worker (not main thread)
  2. UI remains responsive during photo processing (no visible stutter)
  3. Browsers without OffscreenCanvas support fall back to main thread processing
  4. Photo upload tests pass with worker implementation
**Plans**: TBD

Plans:
- [ ] 04-01: Photo processing Web Worker with main thread fallback

### Phase 5: Documentation
**Goal**: New developers can understand the offline sync architecture without reverse-engineering code
**Depends on**: Phases 1-4 (document the refined architecture, not the original)
**Requirements**: QUAL-02, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Mutation lifecycle (pending -> syncing -> synced/failed/conflict) is documented as a state machine diagram
  2. Conflict resolution flow is documented with decision points and outcomes
  3. Documentation lives in `.planning/docs/` or codebase (not external wiki)
**Plans**: TBD

Plans:
- [ ] 05-01: State machine and conflict resolution documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Testing Foundation | 4/4 | ✓ Complete | 2026-01-23 |
| 2. Monitoring | 2/2 | ✓ Complete | 2026-01-23 |
| 3. Batch Sync | 0/1 | Not started | - |
| 4. Web Worker | 0/1 | Not started | - |
| 5. Documentation | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-22*
*Phase 1 planned: 2026-01-22*
*Phase 2 planned: 2026-01-23*
*Total requirements: 16 | Phases: 5 | Depth: standard*
