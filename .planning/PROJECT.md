# ProStreet Quality Milestone

## What This Is

A dedicated quality pass for ProStreet, an offline-first task management PWA for field service crews. This milestone focuses on hardening the existing codebase — improving performance, maintainability, and reliability — before adding new features.

## Core Value

**Field crews can work offline without losing data, and the code is maintainable enough to evolve confidently.**

## Requirements

### Validated

Existing capabilities that work and should remain working:

- ✓ Offline-first task management with IndexedDB caching — existing
- ✓ Mutation queue with optimistic updates — existing
- ✓ Conflict detection during sync — existing
- ✓ Photo uploads with EXIF handling and watermarking — existing
- ✓ Admin dashboard with role-based access (admin/field_user) — existing
- ✓ Task CRUD with custom fields, comments, photos, files, checklists — existing
- ✓ Customer/Job CRM integration — existing
- ✓ PWA with service worker and installable — existing
- ✓ Supabase backend with RLS policies — existing

### Active

Quality improvements for this milestone:

**Performance:**
- [ ] Batch mutation sync (parallel uploads instead of sequential FIFO)
- [ ] Incremental sync (only fetch changed data, not full tables)
- [ ] Web Worker for photo processing (unblock UI during EXIF/watermark)
- [ ] Optimize complex queries (explicit column selection, server-side filtering)

**Maintainability:**
- [ ] Type-safe offline layer (eliminate `any` casts in Dexie operations)
- [ ] Refactor large components (break up 500+ line files where it improves maintainability)
- [ ] Document offline sync state machine (conflict resolution flow, mutation lifecycle)
- [ ] Fix incomplete clearSyncedMutations implementation
- [ ] Properly type force_overwrite flag for conflict resolution

**Reliability:**
- [ ] Add error tracking/monitoring for sync operations
- [ ] Unit tests for offline mutation queue and sync processor
- [ ] Integration tests for conflict resolution scenarios
- [ ] Data purge strategy for synced blobs in IndexedDB

### Out of Scope

- New user-facing features — quality first, features later
- Complete rewrites of working code — moderate refactoring only
- Mobile native app — PWA is the target platform
- OAuth/social login — email/password is sufficient
- Real-time collaboration — not a core requirement

## Context

The app was built rapidly before adopting structured workflows. The codebase mapping (`.planning/codebase/`) revealed:

**Tech debt highlights:**
- Offline layer has `any` casts bypassing type safety
- Several components exceed 500 lines (media-gallery 868, task-modal 846)
- `clearSyncedMutations()` is non-functional — mutations may accumulate
- Conflict resolution uses undocumented `force_overwrite` hack

**Performance concerns:**
- FIFO mutation sync processes one-by-one (100+ mutations = minutes to sync)
- Full table sync on every app start (no incremental updates)
- Photo watermarking blocks main thread

**Risk areas:**
- Offline sync is untested — works but unknown edge case behavior
- Conflict resolution UI/logic are separated without clear contract
- No monitoring means silent failures go unnoticed

## Constraints

- **Tech stack**: Next.js 16, Supabase, Dexie.js — no major stack changes
- **Backwards compatibility**: Existing IndexedDB data must remain accessible
- **Testing approach**: Jest/Vitest for unit tests, Playwright for E2E (already configured)
- **Deployment**: Vercel (https://fieldops-one.vercel.app)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Moderate refactoring depth | Don't break working code for aesthetics | — Pending |
| Quality before features | Solid foundation prevents future tech debt | — Pending |
| Jest for unit tests | Standard, good TypeScript support | — Pending |

---
*Last updated: 2026-01-22 after initialization*
