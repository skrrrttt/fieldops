# Domain Pitfalls: Offline-First PWA Quality Improvements

**Domain:** Offline-first PWA with IndexedDB sync, Web Workers, testing, and monitoring
**Researched:** 2026-01-22
**Project Context:** ProStreet - existing offline-first app with Dexie.js mutation queue, currently 0 tests

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major regressions.

---

### Pitfall 1: Testing Without Test Isolation Causes Cascading Failures

**What goes wrong:** Tests share IndexedDB state via fake-indexeddb, causing test order dependencies. A test that creates data affects subsequent tests, leading to flaky failures that only appear when running the full suite.

**Why it happens:** fake-indexeddb maintains global state by default. Unlike real IndexedDB which persists to disk, the in-memory implementation shares state across test files unless explicitly reset.

**Consequences:**
- Tests pass in isolation but fail in suite
- Debugging becomes nightmare (which test polluted state?)
- CI becomes unreliable, developers lose trust in tests
- May mask real bugs that only appear with certain data states

**Warning signs:**
- `npm test` fails but individual test files pass
- Test failures change based on test execution order
- "Works on my machine" syndrome with tests

**Prevention:**
```typescript
// In test setup (beforeEach)
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  // Create completely fresh IndexedDB for each test
  indexedDB = new IDBFactory();
});
```

**Phase mapping:** Phase 1 (Test Infrastructure Setup) - establish this pattern before writing any tests

**Sources:**
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb)
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB)

---

### Pitfall 2: liveQuery Breaks in Test Environment

**What goes wrong:** Dexie's `liveQuery` reactive queries fail silently or throw errors when using fake-indexeddb, because liveQuery depends on browser-specific globals that don't exist in Node.js test environment.

**Why it happens:** liveQuery uses `BroadcastChannel` and other browser APIs for cross-tab synchronization that fake-indexeddb doesn't polyfill. The dependency on globals means explicit IndexedDB injection doesn't fully solve it.

**Consequences:**
- Cannot test any component using reactive Dexie queries
- Tests may hang waiting for subscriptions that never fire
- False confidence - tests pass but real functionality untested

**Warning signs:**
- Tests timeout on any liveQuery operation
- Error: "indexedDB API not found" despite importing fake-indexeddb
- Tests work with `.toArray()` but fail with `useLiveQuery()`

**Prevention:**
```typescript
// Always import fake-indexeddb/auto at TOP of test file (order matters)
import 'fake-indexeddb/auto';

// For hooks using useLiveQuery, mock the hook instead of testing through it
jest.mock('@/lib/offline/use-background-sync', () => ({
  useBackgroundSync: () => ({
    status: 'idle',
    summary: { pending: 0, conflict: 0 },
    // ... mock return values
  }),
}));
```

**Phase mapping:** Phase 1 (Test Infrastructure) - decide mocking strategy before writing component tests

**Sources:**
- [Dexie liveQuery issue #2046](https://github.com/dexie/Dexie.js/issues/2046)
- [fake-indexeddb Dexie compatibility #39](https://github.com/dumbmatter/fakeIndexedDB/issues/39)

---

### Pitfall 3: Race Conditions in Offline-to-Online Transition

**What goes wrong:** When network comes back online, multiple mutations fire simultaneously instead of sequentially, causing server-side race conditions where requests arrive out of order.

**Why it happens:** The current sync processor processes mutations in a loop but doesn't enforce ordering guarantees when Background Sync fires. Network requests complete in unpredictable order based on payload size and server load.

**Consequences:**
- Data corruption: status changes arrive in wrong order
- Duplicate records if comment/photo creates race with each other
- Conflict detection triggers incorrectly (false positives)

**Warning signs:**
- Users report "my change was overwritten" after coming online
- Server logs show rapid succession of updates for same resource
- Conflict resolution UI shows up unexpectedly

**Prevention:**
```typescript
// Process mutations strictly sequentially (current code does this!)
// But verify sync completion before allowing new mutations to queue

// Add mutex/lock around sync operations
let isSyncInProgress = false;

async function processAllMutations() {
  if (isSyncInProgress) return; // Prevent concurrent sync attempts
  isSyncInProgress = true;
  try {
    // ... process sequentially
  } finally {
    isSyncInProgress = false;
  }
}
```

**Current ProStreet status:** The existing `processAllMutations` function processes sequentially (good), but multiple callers could trigger concurrent runs. Add guard.

**Phase mapping:** Phase 2 (Sync Optimization) - verify before adding batch/parallel sync

---

### Pitfall 4: Batch Sync Hits Rate Limits

**What goes wrong:** Converting sequential sync to parallel/batch sync to improve performance causes 429 Too Many Requests errors from Supabase, creating worse user experience than sequential.

**Why it happens:** Supabase has per-second rate limits. Field users may queue 50+ photos offline during a day's work. Firing all at once overwhelms the API.

**Consequences:**
- Sync fails completely instead of partially
- Retry storms make it worse (exponential backoff without jitter)
- Users stuck in "syncing..." state indefinitely

**Warning signs:**
- Sync takes longer after "optimization"
- Console shows 429 errors
- `failed` mutation count spikes after going online

**Prevention:**
```typescript
// Use controlled concurrency, not full parallelism
const CONCURRENT_LIMIT = 3; // Safe for Supabase free tier

async function processBatched(mutations: TypedPendingMutation[]) {
  const chunks = chunkArray(mutations, CONCURRENT_LIMIT);

  for (const chunk of chunks) {
    // Process chunk in parallel
    await Promise.allSettled(chunk.map(m => processMutation(m)));
    // Small delay between chunks
    await sleep(100);
  }
}

// Always add jitter to prevent thundering herd
function exponentialBackoffWithJitter(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * 1000;
  return base + jitter;
}
```

**Phase mapping:** Phase 2 (Sync Optimization) - test rate limit handling before deploying batch sync

**Sources:**
- [AWS Exponential Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [OpenAI Rate Limit Handling](https://cookbook.openai.com/examples/how_to_handle_rate_limits)

---

### Pitfall 5: Web Worker Transfer Neutering Original Data

**What goes wrong:** After transferring a Blob/ArrayBuffer to the Web Worker for photo processing, the original reference in the main thread becomes unusable ("neutered"), breaking optimistic UI or retry logic.

**Why it happens:** Transferable objects (ArrayBuffer, Blob underlying buffer) are moved, not copied. The original context loses access completely - by design, for performance.

**Consequences:**
- Optimistic UI shows broken image (blob neutered)
- Retry after worker failure impossible - data gone
- Memory leaks if not properly managed

**Warning signs:**
- Photos show but then disappear from UI
- "TypeError: Cannot perform X on a neutered ArrayBuffer"
- Retry button doesn't work for failed photo uploads

**Prevention:**
```typescript
// Strategy 1: Clone before transfer (small photos)
const clone = await blob.arrayBuffer().then(ab => new Blob([ab], { type: blob.type }));
worker.postMessage({ blob: clone });

// Strategy 2: Keep original, only transfer for processing, return result
// Worker receives, processes, returns NEW blob
worker.postMessage({ imageData }, [imageData.buffer]); // Transfer in
// Worker processes and sends back NEW data

// Strategy 3: Store original in IndexedDB before transferring
await savePhotoBlob(tempId, blob);
worker.postMessage({ tempId, blob }, [blob]);
// On failure, retrieve from IndexedDB for retry
```

**Phase mapping:** Phase 3 (Web Worker Implementation) - design data flow before implementation

**Sources:**
- [MDN Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Web Worker Performance with Transferable Objects](https://joji.me/en-us/blog/performance-issue-of-using-massive-transferable-objects-in-web-worker/)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 6: Type-Unsafe Dexie Operations Mask Bugs

**What goes wrong:** Using `as any` to bypass TypeScript errors in Dexie operations (as seen in current helpers.ts) means schema mismatches and invalid data go undetected until runtime.

**Why it happens:** Dexie's generic table API requires careful typing. When table operations are abstracted into helpers, TypeScript struggles to infer correct types. Developers use `as any` to make errors go away.

**Current ProStreet evidence:** `helpers.ts` has 10+ `eslint-disable @typescript-eslint/no-explicit-any` comments.

**Consequences:**
- Runtime errors in production ("Cannot read property X of undefined")
- Schema migrations silently break data access
- No autocomplete/intellisense for stored data shapes

**Warning signs:**
- Frequent `as any` or `eslint-disable` in data layer
- Runtime errors for properties that "should exist"
- Data shows as undefined unexpectedly

**Prevention:**
```typescript
// Use EntityTable for full type safety (Dexie 4.x)
import Dexie, { EntityTable } from 'dexie';

interface Task {
  id: string;
  title: string;
  status_id: string;
}

const db = new Dexie('prostreet_db') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
};

// Now all operations are fully typed
const task = await db.tasks.get('123'); // task: Task | undefined
await db.tasks.update('123', { status_id: 'new' }); // TypeScript validates fields
```

**Phase mapping:** Phase 1 (Test Infrastructure) - fix types before writing tests to catch regressions

**Sources:**
- [Dexie TypeScript Documentation](https://dexie.org/docs/Typescript)
- [Dexie TypeScript Issue #2026](https://github.com/dexie/Dexie.js/issues/2026)

---

### Pitfall 7: Service Worker Cache Prevents Update Deployment

**What goes wrong:** After deploying updates, users continue seeing old version because service worker serves cached assets. "Clear cache" instructions don't help because SW intercepts requests before they reach network.

**Why it happens:** Current sw.js uses `skipWaiting()` on install but cache-first for static assets. If the SW itself is cached, updates never activate. Cache versioning (CACHE_NAME = 'prostreet-v1') only helps if version is actually bumped.

**Current ProStreet status:** `CACHE_NAME = 'prostreet-v1'` - appears unchanged since initial deployment.

**Consequences:**
- Bug fixes don't reach users
- Features ship but users don't see them
- Support tickets about "missing features" that are actually deployed

**Warning signs:**
- Users report old UI after deployment
- `console.log` version stamps show old code
- "Works after hard refresh" reports

**Prevention:**
```javascript
// 1. Tie cache version to build hash
const CACHE_NAME = `prostreet-${process.env.BUILD_ID || 'dev'}`;

// 2. Add update-on-activation cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('prostreet-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// 3. Add version check endpoint that bypasses cache
// GET /api/version returns { version: BUILD_ID }
```

**Phase mapping:** Phase 4 (Monitoring) - add version tracking before major deploys

**Sources:**
- [Service Worker Cache Hell](https://medium.com/@ankit-kaushal/stuck-in-cache-hell-a-service-worker-nightmare-c878ae33abf4)
- [Rich Harris - Service Worker Pitfalls](https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9)

---

### Pitfall 8: Refactoring Hooks Breaks Test Assertions

**What goes wrong:** After refactoring class components to hooks or extracting custom hooks, existing tests fail because they relied on implementation details (`.state()`, `.instance()`) that don't exist in functional components.

**Why it happens:** Testing library patterns for class components directly access internal state. Functional components with hooks have no exposed instance.

**Consequences:**
- All tests need rewriting alongside refactor
- Refactor scope creeps as tests are fixed
- Merge conflicts if refactor takes too long

**Warning signs:**
- Tests use `wrapper.state()` or `wrapper.instance()`
- Tests mock internal methods rather than external behavior
- Test file is longer than component file

**Prevention:**
```typescript
// Test behavior, not implementation
// BAD: Testing internal state
expect(wrapper.state('isLoading')).toBe(true);

// GOOD: Testing observable behavior
expect(screen.getByRole('progressbar')).toBeInTheDocument();

// For custom hooks, use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react';
import { useBackgroundSync } from './use-background-sync';

test('sync status updates when mutation queued', async () => {
  const { result } = renderHook(() => useBackgroundSync());

  act(() => {
    // trigger action
  });

  expect(result.current.summary.pending).toBe(1);
});
```

**Phase mapping:** Phase 5 (Component Refactoring) - establish testing patterns before refactoring

**Sources:**
- [Kent C. Dodds - React Hooks Pitfalls](https://kentcdodds.com/blog/react-hooks-pitfalls)
- [Refactoring Large React Components](https://code.pieces.app/blog/how-to-refactor-large-react-components)

---

### Pitfall 9: Monitoring Without Offline Queue Causes Data Loss

**What goes wrong:** Analytics/monitoring events fired during offline operation are lost because they go directly to network (skipping IndexedDB queue). Sync failures appear as "missing data" in dashboards.

**Why it happens:** Standard analytics SDKs assume connectivity. They may retry briefly but don't persist to IndexedDB for later sync like the mutation queue does.

**Consequences:**
- Offline user behavior invisible in analytics
- Sync failure rates underreported (no event = no failure)
- False confidence in sync reliability

**Warning signs:**
- Analytics show usage drops during field work hours (users were offline)
- Monitoring shows fewer sync attempts than mutation queue processed
- Error rates seem impossibly low

**Prevention:**
```typescript
// Queue monitoring events same as mutations
interface MonitoringEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected';
  timestamp: string;
  metadata: Record<string, unknown>;
}

// Store in IndexedDB
await db.monitoring_events.add(event);

// Flush when online, similar to mutation sync
async function flushMonitoringEvents() {
  const events = await db.monitoring_events.toArray();
  if (events.length === 0) return;

  try {
    await sendToAnalytics(events);
    await db.monitoring_events.clear();
  } catch {
    // Will retry next time
  }
}
```

**Phase mapping:** Phase 4 (Monitoring) - design offline-aware monitoring from start

**Sources:**
- [PWA Analytics - Piwik PRO](https://piwik.pro/blog/pwa-analytics/)
- [Datadog PWA Monitoring](https://www.datadoghq.com/blog/progressive-web-application-monitoring/)

---

### Pitfall 10: OffscreenCanvas Safari Compatibility

**What goes wrong:** Photo processing using OffscreenCanvas works in Chrome but fails in Safari, breaking the feature for iOS users (significant portion of field workers).

**Why it happens:** Safari's OffscreenCanvas support is incomplete. `convertToBlob()` behavior differs, and some 2D context methods behave differently or are missing.

**Consequences:**
- iOS users cannot upload photos
- Silent failures if not properly caught
- Fallback to main thread defeats Web Worker benefit

**Warning signs:**
- "Works on my Android" but fails on iPhone
- Safari console shows canvas errors
- Photo uploads work but are slow (fallback to main thread)

**Prevention:**
```typescript
// Feature detection with fallback
const supportsOffscreenCanvas = (): boolean => {
  try {
    return typeof OffscreenCanvas !== 'undefined' &&
      new OffscreenCanvas(1, 1).getContext('2d') !== null;
  } catch {
    return false;
  }
};

// Safari-specific: test convertToBlob support
const supportsConvertToBlob = async (): Promise<boolean> => {
  if (!supportsOffscreenCanvas()) return false;
  try {
    const canvas = new OffscreenCanvas(1, 1);
    await canvas.convertToBlob();
    return true;
  } catch {
    return false;
  }
};

// Use appropriate processing path
const processor = await supportsConvertToBlob()
  ? new WorkerProcessor()
  : new MainThreadProcessor();
```

**Phase mapping:** Phase 3 (Web Worker) - test on iOS before implementing OffscreenCanvas path

**Sources:**
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Non-blocking Canvas Rendering](https://calendar.perfplanet.com/2025/non-blocking-image-canvas/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major rework.

---

### Pitfall 11: structuredClone Polyfill Missing

**What goes wrong:** fake-indexeddb v5+ removed structuredClone polyfill. Tests fail with "structuredClone is not defined" in older Node versions.

**Prevention:**
```bash
# Use Node 17+ (has native structuredClone)
# OR add polyfill
npm install --save-dev core-js
```

```typescript
// In test setup
import 'core-js/actual/structured-clone';
```

**Phase mapping:** Phase 1 (Test Infrastructure)

---

### Pitfall 12: Multiple useState Causes Excessive Re-renders

**What goes wrong:** Components with many useState hooks re-render on each state change, causing performance issues especially with sync status updates that fire frequently.

**Current ProStreet evidence:** `SyncStatusIndicator` uses hook that polls every 5 seconds - manageable, but refactoring risks introducing this.

**Prevention:**
```typescript
// Use useReducer for complex state
const [state, dispatch] = useReducer(syncReducer, initialState);

// Or batch related state
const [syncState, setSyncState] = useState({
  status: 'idle',
  pending: 0,
  failed: 0,
  conflicts: 0,
});
```

**Phase mapping:** Phase 5 (Component Refactoring)

---

### Pitfall 13: Console Logging in Production

**What goes wrong:** Debug `console.log` statements in sync processor add up when processing many mutations, slowing down sync and filling browser console.

**Current ProStreet evidence:** sw.js has multiple `console.log('[SW]...')` statements.

**Prevention:**
```typescript
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console) : () => {};
```

**Phase mapping:** Phase 4 (Monitoring) - replace with proper logging

---

## Phase-Specific Warnings Summary

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| 1 | Test Infrastructure | Test isolation (#1), liveQuery mocking (#2) | Reset IDBFactory per test, mock hooks |
| 1 | Type Safety | Type-unsafe Dexie (#6) | Migrate to EntityTable before tests |
| 2 | Sync Optimization | Race conditions (#3), Rate limits (#4) | Add mutex, use controlled concurrency |
| 3 | Web Worker | Blob transfer neutering (#5), Safari compat (#10) | Clone before transfer, feature detection |
| 4 | Monitoring | Offline event loss (#9), Stale cache (#7) | Queue monitoring events, version cache |
| 5 | Refactoring | Test breakage (#8), Re-renders (#12) | Test behavior not implementation |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| IndexedDB Testing | HIGH | Verified with fake-indexeddb docs and Dexie issues |
| Sync Race Conditions | MEDIUM | Based on TanStack Query issues, may not apply exactly to current sequential implementation |
| Web Worker Transfer | HIGH | MDN documentation and multiple sources confirm |
| Rate Limiting | MEDIUM | Supabase-specific limits not verified; general pattern well documented |
| Safari Compatibility | MEDIUM | Known issue but specific failure modes depend on implementation |

---

## Sources

### IndexedDB Testing
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb)
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB)
- [Testing IndexedDB with Jest](https://dev.to/andyhaskell/testing-your-indexeddb-code-with-jest-2o17)
- [Dexie TypeScript Documentation](https://dexie.org/docs/Typescript)

### Offline Sync
- [TanStack Query Offline Mutations #4896](https://github.com/TanStack/query/issues/4896)
- [TkDodo - Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [AWS Exponential Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

### Web Workers
- [MDN Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Web Worker Performance](https://joji.me/en-us/blog/performance-issue-of-using-massive-transferable-objects-in-web-worker/)

### Service Workers
- [Service Worker Debugging Tips](https://blog.openreplay.com/tips-tricks-debugging-service-workers/)
- [Rich Harris - Service Worker Pitfalls](https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)

### Monitoring
- [Datadog PWA Monitoring](https://www.datadoghq.com/blog/progressive-web-application-monitoring/)
- [PWA Analytics - Piwik PRO](https://piwik.pro/blog/pwa-analytics/)

### React Refactoring
- [Kent C. Dodds - React Hooks Pitfalls](https://kentcdodds.com/blog/react-hooks-pitfalls)
- [Refactoring Large React Components](https://code.pieces.app/blog/how-to-refactor-large-react-components)
- [Alex Kondov - Refactoring Messy React](https://alexkondov.com/refactoring-a-messy-react-component/)
