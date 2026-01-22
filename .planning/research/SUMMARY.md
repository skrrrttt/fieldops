# Project Research Summary

**Project:** ProStreet Quality Milestone - Offline-First PWA Testing, Monitoring & Optimization
**Domain:** Production quality infrastructure for offline-first Progressive Web Applications
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

ProStreet is an offline-first field operations PWA that uses Dexie.js for IndexedDB storage, a custom mutation queue pattern for sync, and currently has zero test coverage. The quality milestone aims to add testing infrastructure, monitoring, and performance optimizations without disrupting the working offline sync architecture.

The recommended approach builds on modern 2025/2026 tooling: Vitest with fake-indexeddb for unit testing, Playwright for E2E offline scenarios, Sentry with offline transport for error tracking, and Web Workers for photo processing. The critical path focuses on testing the mutation queue and sync processor first (highest data loss risk), followed by monitoring integration, then performance optimizations through batch processing and incremental sync.

The primary risk is breaking the existing offline sync behavior during refactoring. Mitigation requires comprehensive tests before any architectural changes, strict sequential rollout of optimizations (batch sync first, then incremental sync, then Web Workers), and careful handling of race conditions when converting from sequential to parallel processing. Safari OffscreenCanvas compatibility and Supabase rate limits are secondary concerns that require feature detection and controlled concurrency.

## Key Findings

### Recommended Stack

Modern offline-first PWAs in 2026 use specialized testing and monitoring tools that understand IndexedDB and network conditions. The research identified a clear best-in-class stack with high confidence across all recommendations.

**Core technologies:**
- **Vitest (^4.0.18)**: Unit test runner — 2-10x faster than Jest, native ESM support, officially recommended by Next.js docs for new projects
- **fake-indexeddb (^6.2.5)**: IndexedDB polyfill for Node.js — official Dexie.js recommendation, enables testing mutation queue logic without browsers
- **Playwright (^1.57.0)**: E2E testing — built-in `context.setOffline()` for network simulation, official Chrome team recommendation for PWA testing
- **Sentry (^10.36.0)**: Error tracking — includes `makeBrowserOfflineTransport` that queues errors to IndexedDB when offline, flushes automatically when online
- **web-vitals (^5.1.0)**: Core Web Vitals measurement — official Google library, measures LCP/INP/CLS exactly as Chrome reports to CrUX
- **Comlink (^4.4.2)**: Web Worker RPC — 1.1KB library from Google Chrome Labs, turns postMessage into async function calls
- **Pica (^9.0.1)**: Image resizing — optimized for browser, automatically selects best method (WebAssembly, Web Workers, createImageBitmap)

**Critical versions:**
- fake-indexeddb 6.x required for Node 18+ structuredClone support
- Sentry 10.36+ required for makeBrowserOfflineTransport
- Playwright 1.57+ required for improved service worker network events

**What NOT to use:**
- Jest (slower than Vitest, more configuration)
- Cypress (heavier than Playwright, worse offline testing)
- Custom offline error queue (Sentry has built-in IndexedDB transport)

### Expected Features

Production-grade offline-first PWAs require specialized quality infrastructure beyond typical web applications. The mutation queue pattern creates complex state machines that demand rigorous testing and observability.

**Must have (table stakes):**
- Unit tests for mutation queue — Queue is core business logic; bugs cause data loss
- E2E tests with offline simulation — Only way to verify real user offline experience
- Error tracking with offline support — Undetected errors in offline code are invisible to developers
- Core Web Vitals monitoring — Google ranking factor, LCP < 2.5s, INP < 200ms, CLS < 0.1
- Service worker cache hit monitoring — Validates offline strategy effectiveness (target 80-95% hit ratio)
- CI/CD test automation — Catch regressions before production, must include offline scenarios
- Basic sync metrics — Success rate, avg sync time, conflict frequency for operations visibility

**Should have (competitive):**
- State machine documentation (XState) — Makes complex sync logic understandable, generates diagrams from code
- Test coverage gates (70-80%) — Enforces quality standards automatically, 85%+ for critical paths
- Automated conflict resolution — Last-write-wins for comments/photos reduces user friction
- Playwright visual regression tests — Catches UI bugs in offline states (offline banner, sync indicators)
- Synthetic monitoring (Lighthouse CI) — Catch performance regressions automatically on every PR
- ADR documentation for sync decisions — Future developers understand design rationale

**Defer to post-MVP:**
- Sync observability dashboard — Real-time visibility into sync health across users (requires analytics backend infrastructure)
- 100% test coverage requirement — Leads to low-quality tests, delays shipping
- Complex manual conflict resolution UI — Three-way merge UIs too complex for field workers, causes cognitive overload

### Architecture Approach

ProStreet's current architecture has three bottlenecks: sequential FIFO processing (mutations sync one-by-one), full table sync on every app start (wastes bandwidth), and main thread photo processing (blocks UI). The recommended refactoring follows a phased approach prioritized by impact and risk.

**Major components:**
1. **Batch Sync Processor** — Groups mutations by type and processes in controlled parallel batches (5 concurrent for status/comments, 2 for photos) instead of sequential, reducing sync time by 5-10x with minimal risk
2. **Incremental Sync Manager** — Tracks `last_server_updated_at` per table and fetches only changes since that timestamp (90%+ bandwidth reduction), requires server-side `/api/sync/[table]?since=` endpoints
3. **Photo Processing Worker** — Offloads image compression to Web Worker using OffscreenCanvas and Pica, keeps main thread responsive during camera operations with zero-copy Transferable object transfers
4. **Mutation State Machine** — Formalizes state transitions (queued → syncing → synced/failed/conflict) with explicit guards, makes impossible states compile-time errors and improves debuggability

**Critical patterns:**
- **Test isolation**: Reset IndexedDB with `new IDBFactory()` in `beforeEach` to prevent cascading test failures
- **Concurrency control**: Use p-limit pattern with 3-5 concurrent requests to avoid Supabase rate limits (429 errors)
- **Blob transfer**: Clone blobs before transferring to Web Workers or store originals in IndexedDB to prevent neutering
- **Server timestamps**: Always use server timestamps from response headers for sync watermarks (avoid clock skew)
- **Cache versioning**: Tie service worker cache name to build hash to prevent stale cache blocking deployments

### Critical Pitfalls

The research identified 13 pitfalls across 3 severity levels. The top 5 critical pitfalls can cause data loss or require rewrites.

1. **Testing without test isolation causes cascading failures** — fake-indexeddb shares global state between tests, causing order-dependent failures. Prevention: Reset `indexedDB = new IDBFactory()` in `beforeEach` to get fresh database per test.

2. **liveQuery breaks in test environment** — Dexie's reactive queries fail silently in Node.js because they depend on BroadcastChannel and browser globals. Prevention: Import `fake-indexeddb/auto` at top of test files, or mock hooks that use `useLiveQuery` instead of testing through them.

3. **Race conditions in offline-to-online transition** — Multiple mutations fire simultaneously when network returns, causing server-side race conditions where requests arrive out of order. Prevention: Add mutex/lock around sync operations to prevent concurrent runs, verify sequential processing before adding batch/parallel sync.

4. **Batch sync hits rate limits** — Converting to parallel sync without concurrency control overwhelms Supabase API with 429 errors. Prevention: Use controlled concurrency (3-5 concurrent requests max), add exponential backoff with jitter, small delays between batches.

5. **Web Worker transfer neutering original data** — Transferring Blob/ArrayBuffer to worker for photo processing makes the original reference unusable, breaking optimistic UI or retry logic. Prevention: Clone before transfer for small photos, or store original in IndexedDB before transferring, worker returns NEW blob.

**Moderate pitfalls** include type-unsafe Dexie operations (use EntityTable), service worker cache preventing updates (version cache with build hash), and refactoring hooks breaking test assertions (test behavior not implementation).

**Minor pitfalls** include missing structuredClone polyfill (use Node 17+), excessive re-renders from multiple useState (use useReducer), and console logging in production (add DEBUG flag).

## Implications for Roadmap

Based on research, suggested phase structure prioritizes quick wins with low risk first, then graduated complexity:

### Phase 1: Testing Foundation
**Rationale:** Cannot safely refactor sync architecture without tests. Mutation queue is highest data loss risk (430+ lines, zero tests). Establish test infrastructure and patterns before any architectural changes.

**Delivers:**
- Vitest configuration with fake-indexeddb
- Unit tests for `lib/offline/mutation-queue.ts` (FIFO ordering, retry counts, conflict marking)
- Unit tests for `lib/offline/sync-processor.ts` (sequential processing, error handling)
- Test coverage baseline (aim 80%+ on critical paths)
- CI/CD integration with GitHub Actions

**Addresses:**
- Must-have: Unit tests for mutation queue (table stakes)
- Must-have: CI/CD test automation
- Differentiator: Test coverage gates (70-80% overall, 85%+ critical)

**Avoids:**
- Pitfall #1: Test isolation failures (reset IDBFactory per test)
- Pitfall #2: liveQuery breaks (import fake-indexeddb/auto, mock hooks)
- Pitfall #6: Type-unsafe Dexie operations (migrate to EntityTable before tests)

**Research flag:** SKIP — Standard Vitest + fake-indexeddb patterns well-documented

---

### Phase 2: E2E Offline Testing
**Rationale:** Unit tests validate logic, but only E2E tests catch real offline behavior (cache issues, service worker bugs). Add before architectural changes to establish baseline.

**Delivers:**
- Playwright configuration with network simulation
- E2E tests: warm cache offline load, create mutation offline, sync on reconnect, conflict handling
- Visual regression tests for offline banner, sync indicators
- MSW mocking for API responses during tests

**Addresses:**
- Must-have: E2E tests with offline simulation (table stakes)
- Differentiator: Playwright visual regression tests

**Avoids:**
- Pitfall #3: Race conditions in sync (verify sequential processing works)
- Pitfall #7: Service worker cache prevents updates (test cache invalidation)

**Research flag:** SKIP — Playwright offline testing well-documented, `context.setOffline()` standard pattern

---

### Phase 3: Monitoring Integration
**Rationale:** Before optimizing sync, need visibility into current behavior. Sentry with offline transport queues errors during offline operation, providing production data to validate optimizations.

**Delivers:**
- Sentry SDK with `makeBrowserOfflineTransport` configuration
- Source map integration for production builds
- Basic sync metrics (success rate, avg sync time, conflict frequency)
- web-vitals integration with Core Web Vitals reporting
- Version tracking endpoint to detect stale cache issues

**Addresses:**
- Must-have: Error tracking with offline support (table stakes)
- Must-have: Core Web Vitals monitoring
- Must-have: Basic sync metrics
- Must-have: Service worker cache hit monitoring

**Avoids:**
- Pitfall #9: Monitoring without offline queue (use Sentry IndexedDB transport)
- Pitfall #7: Service worker cache prevents updates (add version endpoint)

**Research flag:** SKIP — Sentry offline transport documented in official docs

---

### Phase 4: Batch Sync Optimization
**Rationale:** Quick win for performance (5-10x faster sync) with lowest risk. No server changes required, doesn't change data model. Get monitoring baseline from Phase 3 before optimizing.

**Delivers:**
- Refactored `sync-processor.ts` with batch processing
- Controlled concurrency (5 concurrent for status/comments, 2 for photos)
- Progress reporting for batch sync
- Bundle analysis with @next/bundle-analyzer

**Addresses:**
- Architecture: Batch Sync Processor component
- Differentiator: Improved sync performance

**Avoids:**
- Pitfall #3: Race conditions (add mutex to prevent concurrent sync runs)
- Pitfall #4: Batch sync hits rate limits (controlled concurrency, exponential backoff with jitter)

**Research flag:** SKIP — p-limit pattern for controlled concurrency well-documented

---

### Phase 5: Incremental Sync
**Rationale:** Major bandwidth savings (90%+) for field workers on slow connections. Requires server coordination, so comes after client-side optimizations. `SyncMeta.last_server_updated_at` field already exists but unused.

**Delivers:**
- Server API endpoints: `GET /api/sync/[table]?since=timestamp`
- Client `incrementalSync()` function with watermark management
- Soft delete handling (include `deleted_at` records in sync)
- First-time vs incremental sync logic

**Addresses:**
- Architecture: Incremental Sync Manager component
- Differentiator: Bandwidth optimization for offline-first

**Avoids:**
- Anti-pattern: Optimistic timestamps (use server timestamps from response)
- Anti-pattern: Transaction spanning async calls (fetch first, then write)

**Research flag:** MEDIUM — Server endpoint design needs validation with backend team, delta sync pattern well-documented but Supabase-specific implementation needs design

---

### Phase 6: Web Worker Photo Processing
**Rationale:** UX improvement for photo capture, independent of sync logic. Can develop in parallel with Phase 5. Requires Safari compatibility testing.

**Delivers:**
- `workers/photo-worker.ts` with OffscreenCanvas + Pica
- Main thread fallback for browsers without OffscreenCanvas support
- Transferable object handling with clone-before-transfer strategy
- Feature detection for Safari compatibility

**Addresses:**
- Architecture: Photo Processing Worker component
- Differentiator: Responsive UI during photo operations

**Avoids:**
- Pitfall #5: Web Worker transfer neutering (clone blobs before transfer)
- Pitfall #10: OffscreenCanvas Safari compatibility (feature detection, fallback)

**Research flag:** MEDIUM — Safari OffscreenCanvas behavior needs iOS device testing, general Web Worker patterns well-documented

---

### Phase 7: State Machine Formalization
**Rationale:** Maintainability improvement, not urgent. Defer until after performance optimizations. Helps with debugging complex batch sync if issues arise.

**Delivers:**
- `state-machine.ts` with explicit mutation state transitions
- Refactored sync processor using state machine
- XState visualization for sync flow documentation
- ADR documentation for conflict resolution strategy

**Addresses:**
- Architecture: Mutation State Machine component
- Differentiator: State machine visualization (XState)
- Differentiator: ADR documentation

**Avoids:**
- Current fragile conflict flow (implicit state transitions)

**Research flag:** SKIP — State machine patterns well-documented, XState visualizer standard

---

### Phase Ordering Rationale

**Why testing first (Phases 1-2):** Cannot safely refactor without comprehensive tests. The mutation queue (430+ lines, zero tests) handles user data — bugs cause data loss. Establish test infrastructure and baseline before touching sync architecture.

**Why monitoring before optimization (Phase 3):** Need visibility into current performance to validate optimizations. Sentry provides production error data, web-vitals provides baseline metrics. Without monitoring, optimizations are flying blind.

**Why batch sync before incremental sync (Phase 4 before 5):** Batch sync is client-only (no server changes), lower risk, immediate performance gain. Incremental sync requires server coordination and has more edge cases (soft deletes, clock skew). Get quick win first.

**Why Web Workers independent (Phase 6):** Photo processing doesn't affect sync logic, can develop in parallel with Phase 5. Deferred because it's UX improvement not data integrity risk.

**Why state machine last (Phase 7):** Pure maintainability refactor, no user-facing impact. Only valuable if sync logic becomes hard to debug. Can skip if batch/incremental sync implementations remain clear.

**Dependency graph:**
- Phase 1 (Testing) blocks all others (cannot refactor without tests)
- Phase 2 (E2E) blocks Phases 4-7 (need offline test coverage before architectural changes)
- Phase 3 (Monitoring) blocks Phase 4 (need metrics before optimizing)
- Phase 5 (Incremental) depends on Phase 4 (batch sync establishes patterns)
- Phases 6-7 can run in parallel with Phase 5

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 5 (Incremental Sync):** Server endpoint design needs backend coordination, Supabase-specific query optimization for `updated_at > $since` filtering with soft deletes
- **Phase 6 (Web Worker):** Safari OffscreenCanvas behavior needs iOS device testing matrix, specific Blob handling edge cases

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Testing):** Vitest + fake-indexeddb setup well-documented in official docs
- **Phase 2 (E2E):** Playwright `context.setOffline()` standard pattern, multiple PWA testing guides
- **Phase 3 (Monitoring):** Sentry offline transport documented in official docs, web-vitals is official Google library
- **Phase 4 (Batch Sync):** p-limit pattern for concurrency control widely documented
- **Phase 7 (State Machine):** State pattern well-documented, XState visualizer standard tool

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified with official docs, npm versions confirmed, Next.js official docs recommend Vitest |
| Features | MEDIUM-HIGH | Table stakes validated across multiple PWA testing sources, differentiators based on community best practices |
| Architecture | HIGH | Patterns verified with official Dexie.js docs, AWS backoff recommendations, MDN Web Worker docs |
| Pitfalls | HIGH | IndexedDB testing pitfalls verified with fake-indexeddb GitHub issues, race conditions confirmed with TanStack Query issues, Safari compatibility from MDN |

**Overall confidence:** HIGH

The stack recommendations are highly confident due to official documentation verification. Features are slightly lower confidence because "table stakes" determination involves judgment, but the core testing/monitoring features are well-established in PWA literature. Architecture patterns are high confidence with clear official documentation. Pitfalls are high confidence because they're drawn from actual GitHub issues and MDN documentation.

### Gaps to Address

**Server-side incremental sync implementation:** Research focused on client-side patterns. During Phase 5 planning, need to design Supabase queries for `updated_at > $since` filtering with proper indexing and soft delete handling. Validate performance with large datasets.

**Supabase rate limit specifics:** Research used general rate limiting principles. Before Phase 4 implementation, verify actual Supabase free tier limits (requests per second, concurrent connections) to set appropriate concurrency values. May need to add rate limit detection/backoff.

**Safari OffscreenCanvas edge cases:** Research confirmed general Safari incompatibility. During Phase 6 planning, test specific iOS versions (16.x, 17.x) to determine exact fallback boundaries. May discover additional Safari-specific bugs beyond convertToBlob.

**Background Sync API testing:** Research covered offline testing patterns but didn't deeply explore Background Sync API testing. During Phase 2, may need to research how to test Background Sync triggers in Playwright (likely requires manual trigger simulation).

**Monitoring event schema:** Research recommended queuing monitoring events to IndexedDB like mutations, but didn't specify schema. During Phase 3, design event schema that balances detail (for debugging) with storage efficiency (events accumulate quickly).

## Sources

### Primary (HIGH confidence)
- [Next.js Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest) — Official Next.js recommendation
- [Playwright Service Workers](https://playwright.dev/docs/service-workers) — Official Playwright docs for PWA testing
- [Sentry Offline Caching](https://docs.sentry.io/platforms/javascript/best-practices/offline-caching/) — Official Sentry offline transport docs
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices) — Official Dexie recommendations for testing with fake-indexeddb
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB) — Official docs, version 6.x structuredClone requirements
- [web-vitals GitHub](https://github.com/GoogleChrome/web-vitals) — Official Google library for Core Web Vitals
- [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink) — Official Google Chrome Labs Web Worker library
- [MDN Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) — Blob transfer behavior
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) — Safari compatibility notes

### Secondary (MEDIUM confidence)
- [AWS Exponential Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — Rate limit handling patterns
- [Datadog PWA Monitoring](https://www.datadoghq.com/blog/progressive-web-application-monitoring/) — Observability best practices
- [2025 Web Performance Updates](https://www.debugbear.com/blog/2025-in-web-performance) — Core Web Vitals 2026 standards
- [TanStack Query Concurrent Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — Race condition patterns in sync
- [Martin Fowler - Test Coverage](https://martinfowler.com/bliki/TestCoverage.html) — Coverage percentage recommendations
- [Rich Harris - Service Worker Pitfalls](https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9) — Cache versioning issues

### Tertiary (LOW confidence)
- [Sentry Alternatives Comparison](https://uptrace.dev/comparisons/sentry-alternatives) — Market analysis for monitoring tools
- [Web Workers in Next.js with Comlink](https://park.is/blog_posts/20250417_nextjs_comlink_examples/) — Implementation guide, needs validation with Next.js 16
- [XState Visualizer](https://stately.ai/viz) — State machine documentation tool

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
