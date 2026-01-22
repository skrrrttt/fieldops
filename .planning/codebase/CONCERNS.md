# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Offline Sync Mutation Queue - Incomplete Implementation:**
- Issue: `clearSyncedMutations()` in `lib/offline/mutation-queue.ts:224` is non-functional—it fetches all mutations but does nothing with them
- Files: `lib/offline/mutation-queue.ts`
- Impact: Completed mutations may never be cleared from IndexedDB queue, causing database bloat and confusion about queue state over time
- Fix approach: Implement proper deletion of successfully synced mutations, either by tracking a 'synced' status or requiring explicit deletion after `processAllMutations()` completes

**Type Casting to `any` in Offline Layer:**
- Issue: Dexie.js dynamic table access requires casting to `any` at `lib/offline/helpers.ts:43-44, 58-59, 76-77, 89-90, 104-105, 118-119, 132-133, 143-144, 173-174` and sync processor at `lib/offline/sync-processor.ts:424-425`
- Files: `lib/offline/helpers.ts`, `lib/offline/sync-processor.ts`
- Impact: Loss of type safety in offline storage layer; impossible for TypeScript to catch misuse of table operations
- Fix approach: Create strongly-typed Dexie table wrappers or use template generics with better type guards instead of `as any` casts

**Force Overwrite Flag Hack:**
- Issue: Conflict resolution uses `force_overwrite: true as any` at `lib/offline/mutation-queue.ts:411` to signal sync processor to skip server-newer checks
- Files: `lib/offline/mutation-queue.ts`
- Impact: Type system is bypassed; adding mutations to TypedPendingMutation interface for conflict resolution is fragile and undocumented behavior
- Fix approach: Add `force_overwrite` to the official PendingMutation interface and document conflict resolution flow

**Large Component Files:**
- Issue: Multiple components exceed 500+ lines, creating monoliths difficult to modify
- Files: `components/admin/media/media-gallery.tsx` (868 lines), `components/admin/tasks/task-modal.tsx` (846 lines), `components/admin/tasks/task-table.tsx` (750 lines), `components/tasks/task-detail.tsx` (683 lines), `components/admin/customers/customer-list.tsx` (669 lines)
- Impact: High cognitive load; difficult to test; increased risk of regressions; hard to reuse sub-components
- Fix approach: Break into smaller presentational/container components with clear responsibilities; extract feature logic into custom hooks

**Large Server Action Files:**
- Issue: `lib/checklists/actions.ts` (663 lines) and `lib/tasks/actions.ts` (525 lines) contain multiple unrelated operations in single files
- Files: `lib/checklists/actions.ts`, `lib/tasks/actions.ts`
- Impact: Mixed concerns make it difficult to locate specific operations; harder to test isolated actions
- Fix approach: Organize by operation type (get*, create*, update*, delete*) or split into multiple files per entity

## Known Bugs

**Incomplete clearSyncedMutations Implementation:**
- Symptoms: Mutation queue may accumulate all mutations indefinitely; no "synced" status exists despite intent
- Files: `lib/offline/mutation-queue.ts:224-233`
- Trigger: Call `clearSyncedMutations()` after successful sync—does nothing
- Workaround: Manually call `deleteMutation()` after each successful sync, or clear entire queue with `clearAllMutations()` (dangerous)

## Security Considerations

**Public Supabase Credentials Exposure:**
- Risk: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is readable in client bundle; potentially allows unauthorized API requests if RLS is misconfigured
- Files: `lib/supabase/server.ts` (line 10), `lib/supabase/client.ts`
- Current mitigation: Supabase RLS policies should restrict all table access; env vars marked as `NEXT_PUBLIC_` deliberately
- Recommendations: Audit all RLS policies to ensure anonkey cannot perform unintended actions; consider implementing additional auth checks in sensitive server actions

**Browser-Stored Blobs in IndexedDB:**
- Risk: Photos and files stored as blobs in IndexedDB remain on device indefinitely; no encryption at rest
- Files: `lib/offline/db.ts:44-54` (LocalPhoto/LocalFile types with local_blob), `lib/offline/sync-processor.ts:177-243` (photo mutations)
- Current mitigation: Device-level encryption (iOS Secure Enclave, Android keystore)
- Recommendations: Implement data purge strategy after sync; consider IndexedDB encryption library; warn users about sensitive file storage offline

**Cookie Handling Swallows Errors:**
- Risk: Silent catch block at `lib/supabase/server.ts:21` ignores cookie setAll errors during Server Component execution
- Files: `lib/supabase/server.ts:17-25`
- Current mitigation: Comment notes middleware should refresh sessions; developers may not realize auth refresh failed
- Recommendations: Log failed cookie operations; implement fallback session refresh mechanism; document expected vs unexpected states

## Performance Bottlenecks

**FIFO Mutation Sync Without Batching:**
- Problem: `processAllMutations()` at `lib/offline/sync-processor.ts:340-403` processes mutations one-by-one; each waits for response before processing next
- Files: `lib/offline/sync-processor.ts:363-387`
- Cause: Sequential processing (for in loop) prevents parallel uploads; large offline-first queues (100+ mutations) may take minutes to sync
- Improvement path: Implement configurable batch processing (e.g., 5-10 parallel uploads); prioritize mutations by type (status changes before media)

**Full Table Sync on Every App Start:**
- Problem: `useOfflineSync()` at `lib/offline/use-offline-sync.ts:74-96` syncs entire tasks/statuses/divisions tables to IndexedDB on load
- Files: `lib/offline/use-offline-sync.ts`
- Cause: No incremental sync; wastes bandwidth and CPU reserialization on unchanged data
- Improvement path: Implement timestamp-based incremental sync using `last_server_updated_at` (already in SyncMeta interface at `lib/offline/db.ts:63`)

**Unoptimized Complex Queries:**
- Problem: `getTasks()` at `lib/tasks/actions.ts:41-112` joins 4 related tables (status, division, assigned_user, job→customer); no pagination filtering before client-side processing
- Files: `lib/tasks/actions.ts:60-71`
- Cause: Inline selects without field limits; potential N+1 joins for large datasets
- Improvement path: Add server-side filtering for related fields; use explicit column selection instead of wildcard (*)

**Photo Watermarking on Main Thread:**
- Problem: `processPhoto()` at `lib/photos/process-photo.ts:146-224` runs EXIF parsing and canvas operations synchronously in browser
- Files: `lib/photos/process-photo.ts`
- Cause: No Web Worker; blocks UI during large image processing (smartphones with multiple 4MB+ photos)
- Improvement path: Move processing to Web Worker; implement progress callbacks for UI

## Fragile Areas

**Conflict Resolution UI/Logic Separation:**
- Files: `lib/offline/sync-processor.ts:51-121`, `lib/offline/mutation-queue.ts:392-419`
- Why fragile: Conflict detection happens in sync processor; resolution UI must read conflict data and call `resolveConflict()` action; no guarantee UI/processor stay in sync if conflict flow changes
- Safe modification: Document conflict resolution state machine; add integration tests for offline conflict scenarios; consider moving all conflict logic to single module
- Test coverage: No automated tests; manual testing against Vercel deployment only (`https://fieldops-one.vercel.app`)

**Offline-First Mutation Queue State Machine:**
- Files: `lib/offline/mutation-queue.ts`, `lib/offline/sync-processor.ts`, `lib/offline/use-offline-sync.ts`
- Why fragile: Multiple status values (pending→syncing→failed vs pending→syncing→success vs pending→conflict) with implicit state transitions; no centralized state validation
- Safe modification: Add state machine diagram; implement validation before status transitions; reject invalid state changes with clear errors
- Test coverage: No unit tests; only Playwright end-to-end testing

**Dexie IndexedDB Schema Evolution:**
- Files: `lib/offline/db.ts:150-336` (database definition)
- Why fragile: Schema changes (new tables, indexes) require migrations; Dexie uses version bumping, but no migration strategy documented; deployments could break client IndexedDB
- Safe modification: Document schema versioning strategy; add explicit version comments; test schema upgrades across browser versions
- Test coverage: No schema migration tests

**Branding Context Initialization Race:**
- Files: `lib/theme/theme-context.tsx:15-25` (reads localStorage synchronously in root layout)
- Why fragile: Root layout reads `localStorage` at render time; if branding changes server-side, old cached values persist until manual refresh
- Safe modification: Add server-side branding invalidation token; monitor for stale branding warnings in client logs
- Test coverage: No tests for stale branding scenarios

## Scaling Limits

**IndexedDB Storage Quota:**
- Current capacity: Typical browser quota 50MB-200MB depending on device; app stores tasks + photos + files + mutations
- Limit: Large photo libraries (500+ images) may exceed quota, causing sync failures and offline access degradation
- Scaling path: Implement aggressive offline cache pruning (delete photos older than 30 days); stream large file uploads instead of buffering in memory

**Supabase RLS Query Complexity:**
- Current capacity: No pagination/filtering limits on RLS policies; complex queries with 4+ table joins may hit Postgres limits
- Limit: Admin dashboard queries (getAllPhotos, getTasks with all relations) lack pagination; 1000+ records cause slow admin views
- Scaling path: Implement mandatory pagination in getAllPhotos and similar aggregation queries; add database indexes on division_id, status_id, assigned_user_id

**Service Worker Cache Size:**
- Current capacity: App shell cached by `/public/sw.js`; no size limits defined
- Limit: Uncontrolled cache growth could exceed quota
- Scaling path: Implement cache versioning with cleanup of old app shells; set explicit cache size limits

## Dependencies at Risk

**Dexie.js (v4.2.1) - Limited Community Activity:**
- Risk: Dexie is maintained by a small team; IndexedDB API gaps require workarounds (type casting in helpers)
- Impact: If maintainer becomes unavailable, browser compatibility issues may not be addressed; migration to alternative IndexedDB library would be significant
- Migration plan: Evaluate idb (simpler, browser-native focus) or WxDB (stronger TypeScript support); write abstraction layer to reduce coupling

**Next.js 16 Middleware Dependency:**
- Risk: Auth session refresh happens only in middleware; if middleware breaks, users may not re-authenticate
- Impact: Auth-related bugs could silently accumulate without proper testing
- Migration plan: Add explicit server-side session validation in protected routes; don't rely solely on middleware

## Missing Critical Features

**No Offline-First Documentation:**
- Problem: Complex offline sync flow (queue, mutations, conflict resolution) lacks architectural documentation
- Blocks: Developers can't safely modify offline logic; onboarding new team members is difficult
- Recommendation: Create ADR (Architecture Decision Record) documenting conflict resolution, mutation ordering, and error handling strategies

**No Monitoring/Observability for Sync:**
- Problem: Mutations silently fail or conflict with no alerting; admins unaware of data sync issues
- Blocks: Production issues may go unnoticed (e.g., all status updates failing to sync)
- Recommendation: Add Sentry/error tracking; log sync failures with mutation count/types; expose sync health dashboard in admin UI

**No Automated Testing:**
- Problem: No Jest/Vitest unit tests; only Playwright E2E tests
- Blocks: Refactoring offline logic is risky; impossible to verify edge cases (e.g., concurrent mutations, network recovery)
- Recommendation: Add Jest with tests for `lib/offline/*` functions; mock Supabase for deterministic offline scenarios; test RLS policies with actual auth tokens

**No Rate Limiting on Photo Uploads:**
- Problem: Multiple simultaneous photo uploads may exceed Supabase bandwidth/storage limits
- Blocks: Large teams bulk-uploading photos offline could face unexpected upload failures
- Recommendation: Implement queue rate limiting (max 3 concurrent uploads); add warning if offline mutations exceed 50

## Test Coverage Gaps

**Offline Mutation Queue - No Tests:**
- What's not tested: Conflict detection logic, retry mechanisms, FIFO ordering with mixed mutation types
- Files: `lib/offline/mutation-queue.ts`, `lib/offline/sync-processor.ts`
- Risk: Silent state corruption in mutation queue; mutations could be processed out of order or duplicated
- Priority: High - mutations are critical path for data integrity

**RLS Policy Validation - No Tests:**
- What's not tested: Each RLS policy with different user roles (admin, field_user); edge cases like deleted_at filters
- Files: Supabase policies (not in codebase; need SQL test suite)
- Risk: Unauthorized access if RLS policy has gaps; field users accessing other division data
- Priority: High - security-critical

**Offline Conflict Resolution - No Tests:**
- What's not tested: UI correctly resolves conflicts; resolved mutations properly retry; conflicts don't cascade
- Files: `components/offline/`, `lib/offline/sync-processor.ts`
- Risk: Users could apply incorrect conflict resolution; data corruption if resolution fails silently
- Priority: High - data integrity

**Photo Processing Edge Cases - No Tests:**
- What's not tested: EXIF orientation on various formats (HEIC, WebP); watermark rendering on extreme sizes (12000px)
- Files: `lib/photos/process-photo.ts`
- Risk: Photos could fail processing or render incorrectly for certain iPhone orientations
- Priority: Medium - UX impact

**Large Component Render Performance - No Tests:**
- What's not tested: `media-gallery.tsx` (868 lines) render performance with 100+ photos; re-render optimization
- Files: `components/admin/media/media-gallery.tsx`
- Risk: Admin dashboard slow/frozen when viewing large media galleries
- Priority: Medium - performance impact

---

*Concerns audit: 2026-01-22*
