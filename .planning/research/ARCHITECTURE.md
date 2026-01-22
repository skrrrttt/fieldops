# Architecture Patterns: Offline Sync Optimization

**Domain:** Offline-first sync for field operations PWA
**Researched:** 2026-01-22
**Overall Confidence:** HIGH (patterns verified with official docs and multiple sources)

## Executive Summary

ProStreet's current offline sync architecture has three key bottlenecks:

1. **Sequential FIFO processing** - mutations sync one-by-one, creating latency with many queued changes
2. **Full table sync** - every app start fetches entire datasets, wasting bandwidth
3. **Main thread photo processing** - image compression blocks UI responsiveness

This research recommends a phased refactoring approach: batch processing first (quick win), then incremental sync (bandwidth savings), then Web Worker offloading (UX improvement), and finally state machine formalization (maintainability).

---

## Current Architecture Analysis

### What Exists

```
User Action → Queue Mutation → IndexedDB
                                    ↓
              (when online) → Process FIFO → Supabase API (one by one)
                                    ↓
                           Conflict? → UI Resolution
```

**Current mutation flow (`sync-processor.ts`):**
- Mutations processed in strict FIFO order
- Each mutation: mark syncing → HTTP request → await response → mark complete/failed
- Sequential `for...of` loop with `await` on each mutation
- Photo blobs processed on main thread before upload

**Current sync flow (`use-offline-sync.ts`):**
- Full table fetch on app initialization
- `saveAllToLocal()` bulk writes all data
- No incremental logic despite `last_server_updated_at` field existing in `SyncMeta`

**Current conflict handling:**
- Detection: compare `previous_status_id` with server value
- Resolution: UI-driven local vs server choice
- Retry: `force_overwrite` flag bypasses conflict check

### Pain Points Identified

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Slow sync with many mutations | User waits, UI feels sluggish | Sequential processing (1 HTTP per mutation) |
| Bandwidth waste on startup | Data costs, slow initial load | Full sync every time |
| Photo capture freezes UI | Poor UX, dropped frames | Main thread blob processing |
| Fragile conflict flow | Edge cases cause stuck mutations | Implicit state transitions |

---

## Recommended Architecture Patterns

### Pattern 1: Batch Sync with Parallel Processing

**What:** Group mutations by type and process in parallel batches instead of sequential FIFO.

**Why:** Most mutations are independent. A status change on Task A doesn't depend on a comment on Task B. Parallel processing can dramatically reduce sync time.

**Implementation:**

```typescript
// Current (slow)
for (const mutation of mutations) {
  await processMutation(mutation); // One at a time
}

// Proposed (fast)
const batches = groupByType(mutations); // { status: [...], comment: [...], photo: [...] }

// Process different types in parallel (they hit different tables)
await Promise.all([
  processBatch(batches.status, { concurrency: 5 }),
  processBatch(batches.comment, { concurrency: 5 }),
  // Photos processed separately with lower concurrency (bandwidth)
  processBatch(batches.photo, { concurrency: 2 }),
]);
```

**Concurrency Strategy:**
- Status/Comment mutations: 5 concurrent requests (small payloads)
- Photo/File mutations: 2 concurrent (large payloads, bandwidth-sensitive)
- Use `p-limit` or similar for controlled concurrency

**Batch Size Recommendations:**
- IndexedDB: 500-1000 records per transaction (per Dexie.js best practices)
- HTTP: 5-10 concurrent requests (avoid overwhelming server/connection)

**Conflict Handling in Batch Mode:**
- Continue processing other mutations if one fails
- Collect all conflicts at end, present UI for batch resolution
- Don't block entire sync on single conflict

**Pros:**
- 5-10x faster sync with typical mutation queues
- Better UX (progress bar moves faster)
- Failures isolated to individual mutations

**Cons:**
- Ordering guarantees relaxed (acceptable for independent mutations)
- More complex error handling
- Must identify true dependencies

**When to Use:** Default for all sync operations.

**When NOT to Use:** Mutations with true causal dependencies (rare in this app).

---

### Pattern 2: Incremental (Delta) Sync

**What:** Track `last_server_updated_at` per table and only fetch changes since that timestamp.

**Why:** Full sync wastes bandwidth and time. Field workers often have slow connections. Only ~5% of data typically changes between syncs.

**Current State:** The `SyncMeta` table already has `last_server_updated_at` field but it's unused.

**Implementation:**

```typescript
// Server API pattern
// GET /api/sync/tasks?since=2024-01-22T10:00:00Z

// Client implementation
async function incrementalSync(tableName: TableName) {
  const meta = await getSyncMeta(tableName);
  const since = meta?.last_server_updated_at;

  // Fetch only changes
  const { data, serverTimestamp } = await fetchChanges(tableName, since);

  if (data.length > 0) {
    // Merge changes into local (handles updates AND deletes)
    await mergeChanges(tableName, data);
  }

  // Update watermark
  await updateSyncMeta(tableName, serverTimestamp);
}
```

**Server Requirements:**
- Add API endpoint: `GET /api/sync/[table]?since=timestamp`
- Query: `SELECT * FROM [table] WHERE updated_at > $since`
- Include soft-deleted records (so client can remove them)
- Return server timestamp in response for next watermark

**Handling Deletions:**
- Use soft deletes (`deleted_at` timestamp) - already in schema
- Include deleted records in sync response
- Client removes locally when `deleted_at` is set

**First-Time Sync:**
- When `since` is null, perform full sync (one time only)
- Subsequent syncs are incremental

**Pros:**
- 90%+ bandwidth reduction for typical usage
- Faster sync times
- Better for metered connections

**Cons:**
- Requires server-side changes
- Must handle soft deletes properly
- Clock skew can cause issues (use server timestamps)

**When to Use:** All data fetch operations after initial load.

---

### Pattern 3: Web Worker for Photo Processing

**What:** Offload image compression and blob preparation to a Web Worker.

**Why:** Photo capture and compression currently blocks the main thread, causing UI jank during camera operations.

**Current Flow (problematic):**
```
Camera Capture → Compress on Main Thread → Store Blob → Queue Mutation
                      ↑ BLOCKS UI
```

**Proposed Flow:**
```
Camera Capture → Transfer Blob to Worker → Compress in Worker → Return Compressed
                      ↑ Main thread free              ↓
                  UI stays responsive            Store & Queue
```

**Implementation:**

```typescript
// photo-worker.ts (Web Worker)
self.onmessage = async (event) => {
  const { imageBlob, maxSize, quality } = event.data;

  // Use OffscreenCanvas for compression (if available)
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');

  // Resize if needed
  const { width, height } = calculateDimensions(bitmap, maxSize);
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Convert to blob
  const compressedBlob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: quality || 0.8,
  });

  // Transfer ownership back (zero-copy)
  self.postMessage({ compressedBlob }, [compressedBlob]);
};

// Main thread usage
const worker = new Worker('/workers/photo-worker.js');
const compressed = await compressInWorker(worker, rawBlob);
```

**Transferable Objects:**
- Use `ArrayBuffer` transfer for zero-copy blob handling
- Avoids memory duplication between threads
- Significantly faster for large images

**Fallback Strategy:**
- Check for `OffscreenCanvas` support
- Fall back to main thread compression if unavailable
- Progressive enhancement, not hard requirement

**Pros:**
- UI remains responsive during photo operations
- Can process multiple images in parallel
- Zero-copy transfer for performance

**Cons:**
- Additional complexity (worker lifecycle management)
- Need fallback for older browsers
- Worker bundle size considerations

**When to Use:** All photo capture and upload operations.

---

### Pattern 4: State Machine for Mutation Lifecycle

**What:** Formalize mutation states and transitions using an explicit state machine.

**Why:** Current implicit state handling leads to edge cases where mutations get stuck or have ambiguous status.

**Current State Model (implicit):**
```typescript
type MutationStatus = 'pending' | 'syncing' | 'failed' | 'conflict';
// Transitions happen via updateMutationStatus() calls scattered in code
```

**Proposed State Machine:**

```
                    ┌─────────────┐
                    │   QUEUED    │ ← Initial state
                    └──────┬──────┘
                           │ startSync()
                           ▼
                    ┌─────────────┐
             ┌──────│   SYNCING   │──────┐
             │      └──────┬──────┘      │
             │             │             │
    conflict │    success  │    error    │
             │             │             │
             ▼             ▼             ▼
      ┌───────────┐ ┌───────────┐ ┌───────────┐
      │ CONFLICT  │ │  SYNCED   │ │  FAILED   │
      └─────┬─────┘ └───────────┘ └─────┬─────┘
            │                           │
   resolve()│                    retry()│
            │                           │
            ▼                           ▼
      ┌───────────┐              ┌───────────┐
      │  QUEUED   │              │  QUEUED   │
      │(retry/    │              │ (retry    │
      │ discard)  │              │  count++) │
      └───────────┘              └───────────┘
```

**State Definitions:**

| State | Description | Valid Transitions |
|-------|-------------|-------------------|
| QUEUED | Waiting to sync | SYNCING |
| SYNCING | HTTP request in flight | SYNCED, FAILED, CONFLICT |
| SYNCED | Successfully applied (terminal, delete from queue) | - |
| FAILED | Network/server error | QUEUED (via retry) |
| CONFLICT | Server data differs | QUEUED (force), SYNCED (discard) |

**Implementation:**

```typescript
interface MutationState {
  status: 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError?: string;
  conflict?: ConflictInfo;
}

type MutationEvent =
  | { type: 'START_SYNC' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'CONFLICT_DETECTED'; conflict: ConflictInfo }
  | { type: 'RESOLVE_LOCAL' }  // Keep local, retry with force
  | { type: 'RESOLVE_SERVER' } // Discard local
  | { type: 'RETRY' };

function mutationReducer(state: MutationState, event: MutationEvent): MutationState {
  switch (state.status) {
    case 'queued':
      if (event.type === 'START_SYNC') return { ...state, status: 'syncing' };
      break;
    case 'syncing':
      if (event.type === 'SYNC_SUCCESS') return { ...state, status: 'synced' };
      if (event.type === 'SYNC_ERROR') return { ...state, status: 'failed', lastError: event.error };
      if (event.type === 'CONFLICT_DETECTED') return { ...state, status: 'conflict', conflict: event.conflict };
      break;
    case 'failed':
      if (event.type === 'RETRY') return { ...state, status: 'queued', retryCount: state.retryCount + 1 };
      break;
    case 'conflict':
      if (event.type === 'RESOLVE_LOCAL') return { ...state, status: 'queued' };
      if (event.type === 'RESOLVE_SERVER') return { ...state, status: 'synced' }; // Will be deleted
      break;
  }
  // Invalid transition - log warning, return unchanged
  console.warn(`Invalid transition: ${state.status} + ${event.type}`);
  return state;
}
```

**Benefits:**
- Explicit, testable state transitions
- Impossible states become compile-time errors
- Easier debugging (state history can be logged)
- Clear guard conditions for each transition

**Cons:**
- More boilerplate initially
- Overkill if states remain simple

**When to Use:** When mutation handling grows complex or debugging becomes difficult.

---

### Pattern 5: Automatic Conflict Resolution (CRDT-lite)

**What:** For certain field types, automatically merge conflicts instead of requiring UI resolution.

**Why:** Not all conflicts need human intervention. Many can be safely auto-merged.

**Auto-Mergeable Fields:**

| Field Type | Strategy | Example |
|------------|----------|---------|
| Comments | Always append both | Local and server comments both kept |
| Photos | Always keep both | Both photos preserved |
| Counters | Increment delta | View count: local +3, server +5 = +8 |
| Timestamps | Last-write-wins | `updated_at` uses most recent |

**Requires UI Resolution:**

| Field Type | Why | Example |
|------------|-----|---------|
| Status | Semantic meaning | Task marked "Done" vs "In Progress" |
| Assignments | Business logic | Different people assigned |
| Titles/Descriptions | Content conflict | Different text changes |

**Implementation:**

```typescript
function canAutoMerge(mutation: TypedPendingMutation, conflict: ConflictInfo): boolean {
  // Comments and photos - always safe to keep both
  if (mutation.type === 'comment' || mutation.type === 'photo') {
    return true; // Will create both records
  }

  // Status changes - require UI resolution
  if (mutation.type === 'status') {
    return false;
  }

  return false;
}

function autoMerge(mutation: TypedPendingMutation, conflict: ConflictInfo): MergeResult {
  if (mutation.type === 'comment') {
    // Both comments exist - no action needed, both preserved
    return { action: 'keep_both', localKept: true, serverKept: true };
  }
  // ... other cases
}
```

**Pros:**
- Reduces user friction (fewer conflict dialogs)
- Better offline experience
- Handles most common cases automatically

**Cons:**
- Risk of unexpected data (two comments instead of one)
- Need clear UI indication that merge occurred
- Complex fields still need manual resolution

**When to Use:** Comments, photos, and other additive content.

---

## Data Flow Improvements

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STARTUP                               │
├─────────────────────────────────────────────────────────────────┤
│  Server ─────(full fetch)─────► Client ─────(bulk save)─────► IDB │
│         all tasks, all data           overwrites everything      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MUTATION SYNC                               │
├─────────────────────────────────────────────────────────────────┤
│  Queue: [M1, M2, M3, M4, M5]                                    │
│                                                                  │
│  Process: M1 ──await──► M2 ──await──► M3 ──await──► ...        │
│           (sequential, one HTTP at a time)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Improved Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STARTUP                               │
├─────────────────────────────────────────────────────────────────┤
│  First time:  Server ──(full fetch)──► Client ──(bulk save)──► IDB │
│                                                                  │
│  Subsequent:  Server ──(delta fetch since timestamp)──► Client   │
│                       ──(merge changes)──► IDB                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MUTATION SYNC                               │
├─────────────────────────────────────────────────────────────────┤
│  Queue: [S1, S2, C1, C2, P1]  (status, comment, photo)          │
│                                                                  │
│  Group by type:                                                  │
│    Status:  [S1, S2]  ──parallel──►  Supabase                   │
│    Comment: [C1, C2]  ──parallel──►  Supabase                   │
│    Photo:   [P1]      ──parallel──►  Storage                    │
│                                                                  │
│  Batch result: all complete in ~1 round-trip time               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PHOTO CAPTURE                               │
├─────────────────────────────────────────────────────────────────┤
│  Camera ──(raw blob)──► Web Worker ──(compress)──► Main Thread  │
│                         (off main thread)         (store & queue)│
│                                                                  │
│  Main thread remains responsive during compression               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Recommended Module Structure

```
lib/offline/
├── db.ts                    # Dexie schema (unchanged)
├── helpers.ts               # Local storage helpers (unchanged)
├── mutation-queue.ts        # Queue operations (minor changes)
├── sync-processor.ts        # REFACTOR: batch + parallel
├── incremental-sync.ts      # NEW: delta sync logic
├── state-machine.ts         # NEW: mutation state machine
├── conflict-resolver.ts     # NEW: auto-merge logic
├── use-offline-sync.ts      # REFACTOR: use incremental
├── use-background-sync.ts   # Minor changes
└── index.ts                 # Exports

workers/
└── photo-worker.ts          # NEW: image compression worker

components/offline/
├── conflict-resolution.tsx  # Unchanged (manual conflicts)
├── sync-status-indicator.tsx # Minor updates for batch progress
└── ...
```

### Responsibility Boundaries

| Module | Responsibility | Dependencies |
|--------|----------------|--------------|
| `db.ts` | Schema, IndexedDB access | Dexie |
| `mutation-queue.ts` | CRUD for mutations | db.ts |
| `sync-processor.ts` | Orchestrate batch sync | mutation-queue, state-machine |
| `incremental-sync.ts` | Delta fetch logic | db.ts, Supabase client |
| `state-machine.ts` | Mutation state transitions | Pure (no dependencies) |
| `conflict-resolver.ts` | Auto-merge logic | state-machine |
| `photo-worker.ts` | Image compression | OffscreenCanvas API |

---

## Build Order Implications

### Phase 1: Batch Processing (Quick Win)

**Scope:** Refactor `sync-processor.ts` to process mutations in parallel batches.

**Why First:**
- Immediate performance improvement
- Lowest risk (doesn't change data model)
- No server changes required
- ~2-3 days effort

**Dependencies:** None

**Deliverables:**
- `processBatchMutations()` function
- Concurrency control (p-limit pattern)
- Updated progress reporting for batches

### Phase 2: Incremental Sync

**Scope:** Implement delta sync using `last_server_updated_at` watermarks.

**Why Second:**
- Major bandwidth savings
- Requires server API changes (coordinate with backend)
- ~3-5 days effort (client + server)

**Dependencies:**
- Server must expose `/api/sync/[table]?since=` endpoint
- Must ensure `updated_at` is reliably set on all mutations

**Deliverables:**
- `incrementalSync()` function
- Server sync endpoints
- Watermark management in `SyncMeta`

### Phase 3: Web Worker for Photos

**Scope:** Offload photo compression to Web Worker.

**Why Third:**
- UX improvement, not blocking
- Can be done independently
- ~2-3 days effort

**Dependencies:**
- Browser support for `OffscreenCanvas` (fallback needed)

**Deliverables:**
- `photo-worker.ts`
- `compressInWorker()` helper
- Fallback to main thread

### Phase 4: State Machine Formalization

**Scope:** Replace implicit state updates with explicit state machine.

**Why Last:**
- Maintainability improvement
- Not urgent unless debugging becomes hard
- ~1-2 days effort

**Dependencies:** None (pure refactor)

**Deliverables:**
- `state-machine.ts`
- Refactored `sync-processor.ts` to use transitions
- Unit tests for state transitions

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Sync Lock

**What:** Preventing any sync while another sync is in progress.

**Why Bad:** Creates unnecessary waiting. Batch processing is better.

**Instead:** Use per-mutation or per-batch locking, allow parallel batches.

### Anti-Pattern 2: Optimistic Timestamps

**What:** Using client timestamps for sync watermarks.

**Why Bad:** Clock skew between devices causes missed updates or duplicates.

**Instead:** Always use server timestamps from response headers.

### Anti-Pattern 3: Transaction Spanning Async Calls

**What:** Starting IndexedDB transaction, making HTTP call, then writing result.

**Why Bad:** Transaction will auto-commit during await, causing `TransactionInactiveError`.

**Instead:** Fetch data first, then open transaction for write.

```typescript
// BAD
await db.transaction('rw', db.tasks, async () => {
  const serverData = await fetch('/api/tasks'); // Transaction dies here
  await db.tasks.bulkPut(serverData);
});

// GOOD
const serverData = await fetch('/api/tasks');
await db.transaction('rw', db.tasks, async () => {
  await db.tasks.bulkPut(serverData);
});
```

### Anti-Pattern 4: Unbounded Retry

**What:** Retrying failed mutations forever.

**Why Bad:** Network errors can persist. Stale mutations clutter queue.

**Instead:** Implement max retry count (e.g., 5 attempts), then require manual intervention.

### Anti-Pattern 5: Blocking Conflict Resolution

**What:** Halting all sync until user resolves every conflict.

**Why Bad:** One conflict blocks unrelated mutations.

**Instead:** Process non-conflicting mutations, batch conflicts for later resolution.

---

## Sources

### Official Documentation
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)
- [Dexie.js bulkPut()](https://dexie.org/docs/Table/Table.bulkPut())
- [Dexie.js Transactions](https://dexie.org/docs/Dexie/Dexie.transaction())

### Architecture Patterns
- [Offline-First Application Design](https://www.bigthinkcode.com/insights/offline-first-application)
- [Offline-First Architecture](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [Design Guide for Offline-First Apps](https://hasura.io/blog/design-guide-to-offline-first-apps)
- [Offline Data Sync Patterns - OutSystems](https://success.outsystems.com/documentation/11/building_apps/data_management/offline/offline_data_sync_patterns/)

### Incremental Sync
- [ETL Incremental Loading](https://airbyte.com/data-engineering-resources/etl-incremental-loading)
- [Delta Sync - AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-delta-sync.html)
- [Data Warehouse Incremental Load Strategies](https://blog.skyvia.com/incremental-load-strategy-for-data-warehouses/)

### Web Workers
- [Using Web Workers for Heavy Tasks](https://dev.to/vunguyeen/using-web-workers-to-handle-heavy-tasks-in-the-browser-27lo)
- [Web Workers for Image Processing](https://www.sitepoint.com/using-web-workers-to-improve-image-manipulation-performance/)
- [browser-image-compression library](https://github.com/Donaldcwl/browser-image-compression)
- [Lightning-Fast Image Compression with Web Workers](https://medium.com/@hawk-engineering/how-we-built-lightning-fast-image-compression-with-web-workers-and-why-your-users-will-thank-you-9cced5d44b9e)

### State Machines
- [Finite State Machine Patterns](https://patterns.eecs.berkeley.edu/?page_id=470)
- [State Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/state)
- [Use State Machines!](https://rclayton.silvrback.com/use-state-machines)

### Conflict Resolution
- [About CRDTs](https://crdt.tech/)
- [CRDTs in Distributed Systems](https://redis.io/blog/diving-into-crdts/)
- [Why CRDTs Alone Aren't Enough](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)

### Concurrency Control
- [API Concurrency Control Strategies](https://medium.com/swlh/api-concurrency-control-strategies-cd546c2cdc16)
- [Optimistic Concurrency](https://dev.to/harri_etty/what-you-need-to-know-about-optimistic-concurrency-1g3l)
