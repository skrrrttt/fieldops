# Feature Landscape: Offline-First PWA Quality

**Domain:** Production Quality for Offline-First PWA Applications
**Researched:** 2026-01-22
**Overall Confidence:** MEDIUM-HIGH

## Executive Summary

Production-grade offline-first PWAs require quality infrastructure that goes beyond typical web applications. The mutation queue pattern, conflict resolution, and background sync create complex state machines that demand specialized testing approaches, monitoring, and documentation.

Based on research, the quality landscape divides into:
- **Table Stakes:** Testing coverage for offline logic (unit + E2E), error tracking, Core Web Vitals monitoring
- **Differentiators:** State machine documentation, conflict resolution analytics, sync observability dashboards
- **Anti-Features:** Over-engineering retry logic, blocking deploys on 100% coverage, complex manual conflict resolution UIs

---

## Table Stakes

Features users and stakeholders expect. Missing = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Unit tests for mutation queue** | Queue is core business logic; bugs cause data loss | Medium | fake-indexeddb, Vitest | Must test FIFO ordering, retry logic, conflict detection |
| **E2E tests with offline simulation** | Only way to verify real user experience | Medium | Playwright, context.setOffline() | Test cold + warm loads, cache behavior |
| **Error tracking (Sentry or similar)** | Undetected errors in offline code are invisible | Low | Sentry SDK | Include user context, breadcrumbs for sync state |
| **Core Web Vitals monitoring** | Google ranking factor, user experience baseline | Low | web-vitals library or RUM | LCP < 2.5s, INP < 200ms, CLS < 0.1 |
| **Service worker cache hit monitoring** | Validates offline strategy effectiveness | Low | Custom metrics to analytics | Target 80-95% cache hit ratio |
| **Basic sync metrics** | Operations team needs visibility into sync health | Medium | Analytics events | Success rate, avg sync time, conflict frequency |
| **CI/CD test automation** | Catch regressions before production | Medium | GitHub Actions, Playwright | Must include offline scenarios |
| **Typed Dexie schema** | IndexedDB schema errors are silent failures | Low | Already in place | Verify via TypeScript |

### Rationale

**Unit tests for mutation queue (MEDIUM complexity)**

The mutation queue (`lib/offline/mutation-queue.ts`) is 430+ lines of critical business logic handling FIFO ordering, retry counts, conflict marking, and status transitions. Without tests:
- Ordering bugs could cause data corruption
- Retry logic failures could lose user data
- Conflict detection edge cases are invisible

Testing approach:
```typescript
// Use fake-indexeddb to mock IndexedDB in Node.js
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// Test FIFO ordering
// Test retry_count increments on failure
// Test conflict marking
// Test status transitions: pending -> syncing -> success/failed/conflict
```

**Sources:**
- [fake-indexeddb npm package](https://www.npmjs.com/package/fake-indexeddb)
- [Testing your IndexedDB code with Jest](https://dev.to/andyhaskell/testing-your-indexeddb-code-with-jest-2o17)

**E2E tests with offline simulation (MEDIUM complexity)**

Playwright supports PWA testing including offline mode simulation via `context.setOffline()`. Critical scenarios:

1. **Cold load offline:** User has never visited, goes offline - should show meaningful error
2. **Warm load offline:** User visited before, goes offline - should load from cache
3. **Create while offline:** User makes changes offline - should queue mutations
4. **Sync on reconnect:** User comes online - mutations should sync in order

```typescript
// Playwright offline testing
await context.setOffline(true);
await page.goto('/tasks');
await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
```

**Sources:**
- [Testing Service Worker | Vite PWA](https://vite-pwa-org.netlify.app/guide/testing-service-worker)
- [Can I use Playwright to test PWAs? | WebScraping.AI](https://webscraping.ai/faq/playwright/can-i-use-playwright-to-test-progressive-web-apps-pwas)

**Error tracking with Sentry (LOW complexity)**

Sentry is the industry standard for browser error tracking. For offline-first apps, configuration must include:

- **Breadcrumbs:** Track sync state transitions for debugging
- **User context:** Associate errors with user IDs
- **Filtering:** Ignore network errors that are expected offline
- **Custom metrics:** Sync success rate, conflict frequency

```typescript
// Filter expected offline errors
Sentry.init({
  ignoreErrors: ['Failed to fetch', 'NetworkError'],
  beforeSend(event) {
    // Add sync state context
    return event;
  }
});
```

**Sources:**
- [Using Sentry.io for Real-Time Error Tracking](https://blog.pixelfreestudio.com/using-sentry-io-for-real-time-error-tracking/)
- [Sentry PWA Integration (Intershop example)](https://github.com/intershop/intershop-pwa/blob/develop/docs/guides/sentry-error-monitoring.md)

**Core Web Vitals monitoring (LOW complexity)**

2026 standards require:
- **LCP (Largest Contentful Paint):** < 2.5 seconds
- **INP (Interaction to Next Paint):** < 200ms (replaced FID)
- **CLS (Cumulative Layout Shift):** < 0.1

PWAs have an advantage for return visits (cached assets), but first-visit performance still requires optimization.

**Sources:**
- [Core Web Vitals 2026: Technical SEO Guide](https://almcorp.com/blog/core-web-vitals-2026-technical-seo-guide/)
- [2026 Web Performance Standards](https://www.inmotionhosting.com/blog/web-performance-benchmarks/)

---

## Differentiators

Features that set the product apart. Not expected, but valued by users/stakeholders.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **State machine visualization (XState)** | Makes complex sync logic understandable and debuggable | Medium | XState, Stately.ai | Generates diagrams from code |
| **Sync observability dashboard** | Real-time visibility into sync health across users | High | Analytics backend, dashboard | Shows success rates, queue depths, conflict rates |
| **Automated conflict resolution** | Reduces user friction; most conflicts have obvious resolution | Medium | Custom logic | Last-write-wins for non-critical fields |
| **Test coverage gates in CI** | Enforces quality standards automatically | Low | Vitest coverage, GitHub Actions | Aim for 70-80% on critical paths |
| **Playwright visual regression tests** | Catches UI bugs in offline states | Medium | Playwright screenshots | Offline banner, sync indicators |
| **Background sync metrics** | Know if Background Sync API is working | Low | Custom analytics | Track registration success, trigger frequency |
| **Synthetic monitoring (Lighthouse CI)** | Catch performance regressions automatically | Medium | Lighthouse CI, GitHub Actions | Run on every PR |
| **ADR documentation for sync decisions** | Future developers understand design rationale | Low | Markdown files | Document conflict resolution strategy, retry policy |

### Rationale

**State machine visualization with XState (MEDIUM complexity)**

The sync processor (`lib/offline/sync-processor.ts`) implements an implicit state machine:
```
idle -> syncing -> synced/error
pending -> syncing -> success/failed/conflict
```

XState makes this explicit and provides:
- **Visual diagrams:** Auto-generated from code
- **Shareable documentation:** Non-technical stakeholders can understand flow
- **Bug detection:** Missing transitions become visible
- **Export formats:** Mermaid, Markdown, JSON

The [XState Visualizer](https://stately.ai/viz) can generate diagrams interactively or embed in documentation.

**Sources:**
- [XState Visualizer](https://stately.ai/viz)
- [State Machine Advent: Visualize your state machines](https://dev.to/codingdive/state-machine-advent-visualize-your-state-machines-with-diagrams-as-you-code-4-24-1m7b)

**Sync observability dashboard (HIGH complexity)**

A sync observability dashboard provides:
- **Queue depth over time:** Are users accumulating unsynced changes?
- **Sync success rate:** What percentage of operations succeed on first try?
- **Conflict frequency:** How often are conflicts occurring?
- **P95 sync latency:** How long do mutations wait before syncing?

This requires:
1. Instrumentation in sync processor to emit metrics
2. Analytics backend to aggregate
3. Dashboard to visualize

**Value:** Proactively detect sync issues before users report them.

**Sources:**
- [Best practices for monitoring PWAs | Datadog](https://www.datadoghq.com/blog/progressive-web-application-monitoring/)
- [11 Key Observability Best Practices 2026](https://spacelift.io/blog/observability-best-practices)

**Test coverage gates (LOW complexity)**

Industry standard is **70-80%** coverage for production applications. For offline-first apps, prioritize:

1. **Critical paths (aim 90%+):**
   - Mutation queue operations
   - Sync processor logic
   - Conflict detection/resolution

2. **Standard paths (aim 70-80%):**
   - UI components
   - Helper utilities

3. **Low priority:**
   - Generated code (Supabase types)
   - Simple wrappers

```json
// vitest.config.ts coverage thresholds
{
  "coverage": {
    "thresholds": {
      "lines": 70,
      "branches": 70,
      "lib/offline/**": { "lines": 85 }
    }
  }
}
```

**Sources:**
- [Is 70%, 80%, 90%, or 100% Code Coverage Good Enough?](https://www.qt.io/quality-assurance/blog/is-70-80-90-or-100-code-coverage-good-enough)
- [What unit test coverage percentage should teams aim for? | TechTarget](https://www.techtarget.com/searchsoftwarequality/tip/What-unit-test-coverage-percentage-should-teams-aim-for)

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **100% test coverage requirement** | Leads to low-quality tests written to hit numbers; delays shipping | Focus on critical path coverage (80%+), let peripheral code be lower |
| **Complex manual conflict resolution UI** | Users don't want to be database admins; cognitive overload | Auto-resolve when possible; simple "keep mine" / "keep theirs" for must-ask cases |
| **Custom retry backoff algorithms** | Reinventing the wheel; subtle bugs | Use proven patterns: exponential backoff with jitter, max retries |
| **Blocking sync for all failures** | One failed mutation shouldn't block others | Continue processing queue; mark individual mutations as failed |
| **Real-time sync without batching** | Network thrashing; battery drain on mobile | Batch mutations; sync on intervals or connectivity change |
| **Testing only happy paths** | Offline logic fails in edge cases | Test: network drops mid-sync, corrupt cache, stale service worker |
| **Storing large blobs in mutation queue** | IndexedDB has size limits; slows sync | Store blob references; upload separately with resume support |
| **Ignoring PWA installation metrics** | No visibility into PWA adoption vs web | Track installation prompts shown/accepted/dismissed |
| **Over-instrumenting everything** | Performance overhead; data overload | Instrument critical paths only; use sampling for high-volume events |

### Rationale

**100% test coverage is harmful**

Martin Fowler: "If you make a certain level of coverage a target, people will try to attain it. The trouble is that high coverage numbers are too easy to reach with low quality testing."

100% coverage:
- Encourages writing tests just to hit the number
- Delays shipping while chasing marginal coverage
- Doesn't guarantee correctness

**Better approach:** Set meaningful thresholds (70-80% overall, 85%+ for critical paths like mutation queue), focus on test quality over quantity.

**Sources:**
- [bliki: Test Coverage | Martin Fowler](https://martinfowler.com/bliki/TestCoverage.html)

**Complex conflict resolution UI is a trap**

The current ProStreet implementation has a `resolveConflict` function with 'local' | 'server' options. This is appropriate for status conflicts.

**Avoid:**
- Three-way merge UIs (too complex for field workers)
- Detailed diff views (information overload)
- Blocking user workflow until conflicts resolved

**Better approach:**
- Auto-resolve when possible (e.g., last-write-wins for comments)
- Simple binary choice when user input required
- Allow skipping conflict resolution to continue working

**Sources:**
- [Data Synchronization in PWAs: Conflict Resolution](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)

---

## Feature Dependencies

```
Unit Tests (mutation queue)
    |
    v
E2E Tests (Playwright) <-- requires Service Worker tests
    |
    v
CI/CD Integration
    |
    +---> Coverage Gates
    |
    +---> Lighthouse CI (synthetic monitoring)

Error Tracking (Sentry)
    |
    v
Sync Observability <-- depends on instrumentation in sync processor
    |
    v
Dashboard (requires analytics backend)

State Machine Docs (XState)
    |
    v
ADR Documentation
```

### Implementation Order Recommendation

**Phase 1: Foundation (LOW effort, HIGH impact)**
1. Unit tests for mutation queue + sync processor
2. Sentry error tracking
3. Core Web Vitals monitoring

**Phase 2: Automation (MEDIUM effort, HIGH impact)**
4. Playwright E2E tests with offline scenarios
5. CI/CD test automation
6. Coverage gates (start at 60%, raise over time)

**Phase 3: Observability (MEDIUM effort, MEDIUM impact)**
7. Sync success/failure metrics
8. Background sync tracking
9. Lighthouse CI

**Phase 4: Documentation (LOW effort, MEDIUM impact)**
10. State machine visualization
11. ADR for sync decisions
12. Architecture diagrams

---

## MVP Recommendation

For a quality milestone MVP, prioritize:

### Must Have (Table Stakes)
1. **Unit tests for `lib/offline/mutation-queue.ts`** - Core business logic, data loss risk
2. **Unit tests for `lib/offline/sync-processor.ts`** - Complex state transitions
3. **Sentry integration** - Visibility into production errors
4. **2-3 Playwright E2E tests** - Offline load, create offline, sync on reconnect
5. **Core Web Vitals tracking** - Basic performance baseline

### Should Have (Strong Differentiators)
6. **CI/CD test automation** - Prevent regressions
7. **State machine documentation** - Undocumented sync logic is current gap

### Defer to Post-MVP
- Sync observability dashboard (requires backend work)
- Synthetic monitoring (nice but not critical)
- Visual regression tests (lower priority than functional)

---

## Complexity Assessment

| Feature | Development | Maintenance | Risk |
|---------|-------------|-------------|------|
| Unit tests (mutation queue) | Medium | Low | Low |
| E2E tests (Playwright offline) | Medium | Medium | Medium (flakiness) |
| Sentry integration | Low | Low | Low |
| Core Web Vitals | Low | Low | Low |
| State machine docs (XState) | Medium | Low | Low |
| Sync observability dashboard | High | High | Medium |
| CI/CD automation | Medium | Medium | Low |
| Coverage gates | Low | Low | Low |

---

## Testing Strategy Deep Dive

### Unit Testing Offline Logic

**What to test in `mutation-queue.ts`:**
- `queueStatusMutation` creates correct mutation shape
- `getPendingMutations` returns FIFO order
- `updateMutationStatus` increments retry_count on failure
- `markMutationConflict` sets conflict info correctly
- `resolveConflict` handles 'local' and 'server' paths
- Edge cases: empty queue, max retries, IndexedDB unavailable

**What to test in `sync-processor.ts`:**
- `processStatusMutation` conflict detection logic
- `processAllMutations` FIFO processing
- Error handling for each mutation type
- Background sync registration fallback

**Testing tools:**
```bash
npm install -D vitest fake-indexeddb @testing-library/react
```

### E2E Testing Offline Scenarios

**Critical test scenarios:**

1. **Warm cache offline load**
   - Visit app online (populate cache)
   - Go offline
   - Reload page
   - Assert: App loads from cache, offline indicator visible

2. **Create mutation offline**
   - Go offline
   - Create a status change
   - Assert: Mutation queued in IndexedDB, optimistic UI update

3. **Sync on reconnect**
   - Create mutations while offline
   - Go online
   - Assert: Mutations sync, UI reflects server state

4. **Conflict handling**
   - Create mutation offline
   - Modify same data on server
   - Go online
   - Assert: Conflict detected, resolution UI appears

**Sources:**
- [How to Test Progressive Web Apps | Pcloudy](https://www.pcloudy.com/blogs/how-to-test-progressive-web-apps/)
- [Guide to Playwright E2E Testing 2026](https://www.deviqa.com/blog/guide-to-playwright-end-to-end-testing-in-2025/)

---

## Metrics to Track

### Table Stakes Metrics
| Metric | Target | Tool |
|--------|--------|------|
| LCP | < 2.5s | web-vitals |
| INP | < 200ms | web-vitals |
| CLS | < 0.1 | web-vitals |
| Error rate | < 1% | Sentry |
| Test coverage (critical paths) | > 80% | Vitest |

### Differentiator Metrics
| Metric | Target | Tool |
|--------|--------|------|
| Sync success rate | > 95% | Custom analytics |
| Cache hit ratio | 80-95% | Custom analytics |
| Conflict rate | < 5% | Custom analytics |
| P95 sync latency | < 5s | Custom analytics |

---

## Sources

### Testing Practices
- [Best practices for testing PWAs | Bitsol Technologies](https://bitsol.tech/best-practices-for-testing-progressive-web-apps/)
- [Testing your IndexedDB code with Jest](https://dev.to/andyhaskell/testing-your-indexeddb-code-with-jest-2o17)
- [fake-indexeddb npm package](https://www.npmjs.com/package/fake-indexeddb)

### Monitoring & Observability
- [Best practices for monitoring PWAs | Datadog](https://www.datadoghq.com/blog/progressive-web-application-monitoring/)
- [11 Key Observability Best Practices 2026](https://spacelift.io/blog/observability-best-practices)
- [Can OpenTelemetry Save Observability in 2026? | The New Stack](https://thenewstack.io/can-opentelemetry-save-observability-in-2026/)

### Performance
- [Core Web Vitals 2026: Technical SEO Guide](https://almcorp.com/blog/core-web-vitals-2026-technical-seo-guide/)
- [2026 Web Performance Standards](https://www.inmotionhosting.com/blog/web-performance-benchmarks/)
- [PWA and Core Web Vitals | SimiCart](https://simicart.com/blog/pwa-core-web-vitals/)

### Coverage Standards
- [Is 70%, 80%, 90%, or 100% Code Coverage Good Enough? | Qt](https://www.qt.io/quality-assurance/blog/is-70-80-90-or-100-code-coverage-good-enough)
- [What unit test coverage percentage should teams aim for? | TechTarget](https://www.techtarget.com/searchsoftwarequality/tip/What-unit-test-coverage-percentage-should-teams-aim-for)
- [bliki: Test Coverage | Martin Fowler](https://martinfowler.com/bliki/TestCoverage.html)

### State Machine Documentation
- [XState Visualizer | Stately](https://stately.ai/viz)
- [Data synchronization with state machines (XState)](https://kadeer.medium.com/synchronization-with-state-machines-xstate-and-data-loaders-in-nodejs-77071c659c08)

### Offline-First Patterns
- [Offline-First App Development Guide](https://medium.com/@hashbyt/offline-first-app-development-guide-cfa7e9c36a52)
- [The Complete Guide to Offline-First Architecture | droidcon](https://www.droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/)
- [Data Synchronization in PWAs | GTCSys](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
