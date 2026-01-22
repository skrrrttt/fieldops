# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Offline-first progressive web app (PWA) with role-based access control and client-server synchronization.

**Key Characteristics:**
- Server-driven data with client-side caching via IndexedDB (Dexie.js)
- Mutation queue pattern for offline-to-online sync with conflict detection
- Next.js App Router for routing and server actions
- Role-based middleware enforcement at app level
- Denormalized local data structures for offline display
- PWA capabilities: service worker, offline support, installable

## Layers

**Presentation Layer (Client Components):**
- Purpose: Render UI, handle user interactions, manage local state for UI concerns
- Location: `components/` (organized by feature: `tasks/`, `admin/`, `offline/`, `layout/`, `ui/`, `theme/`)
- Contains: React components, hooks, UI state management
- Depends on: lib (actions, hooks), database types, offline utilities
- Used by: Page components in `app/`
- Pattern: Client components ('use client') for interactive features, server components for data fetching

**Server Actions Layer (Data Mutations):**
- Purpose: Handle all write operations to Supabase, isolated from client
- Location: `lib/[feature]/actions.ts` (e.g., `lib/tasks/actions.ts`, `lib/auth/actions.ts`)
- Contains: 'use server' marked functions for create/update/delete operations
- Depends on: Supabase client, database types, auth checks
- Used by: Client components, page components, offline sync processor
- Pattern: Exported async functions that throw or return ActionResult with success/error
- Examples: `lib/tasks/actions.ts`, `lib/customers/actions.ts`, `lib/comments/actions.ts`

**Data Fetching Layer (Server Pages/Components):**
- Purpose: Fetch initial data on server and pass to client
- Location: `app/[route]/page.tsx` (server component by default)
- Contains: Server component that calls actions, then renders presentation
- Depends on: Server actions, auth guards, page layout components
- Used by: Next.js routing
- Pattern: async server components that requireAuth/requireAdmin, call actions, render with data
- Examples: `app/tasks/page.tsx`, `app/admin/dashboard/page.tsx`

**Offline Layer (Local Storage & Sync):**
- Purpose: IndexedDB caching, mutation queuing, and background sync
- Location: `lib/offline/`
- Contains: Dexie database (`db.ts`), sync processor (`sync-processor.ts`), mutation queue (`mutation-queue.ts`), hooks (`use-offline-sync.ts`, `use-background-sync.ts`)
- Depends on: Supabase client, local storage APIs, service worker
- Used by: Client components with offline-aware wrappers
- Key files:
  - `lib/offline/db.ts` - Dexie schema with LocalTask, LocalComment, LocalPhoto, LocalFile types
  - `lib/offline/mutation-queue.ts` - Queue operations for pending mutations
  - `lib/offline/sync-processor.ts` - FIFO processing of queued mutations with conflict detection
  - `lib/offline/use-offline-sync.ts` - Hook to load from cache, track sync state
  - `lib/offline/use-task-offline.ts` - Task-specific offline mutation hook

**Authentication & Authorization Layer:**
- Purpose: User session management and role-based routing
- Location: `lib/auth/actions.ts`, `middleware.ts`
- Contains: Auth state retrieval, role checking, redirect guards
- Depends on: Supabase auth, database user table
- Used by: Middleware (routing), server actions, server components
- Pattern: Functions like requireAuth(), requireAdmin(), getCurrentUser()
- Middleware path: `middleware.ts` - Checks user session, enforces admin routes, redirects login

**Theming Layer (Context + Branding):**
- Purpose: Dark mode support and white-label branding
- Location: `lib/theme/theme-context.tsx`, `components/providers/branding-provider-wrapper.tsx`
- Contains: Theme provider, branding context, CSS custom properties
- Depends on: React context, localStorage
- Used by: Root layout, all components
- CSS variables: `--brand-primary`, `--brand-accent`, font stacks (Sora, DM Sans, DM Mono)

## Data Flow

**Initial Load - Field User:**

1. User navigates to app → middleware checks auth
2. If unauthenticated → redirect to `/login`
3. If authenticated, navigate to `/tasks` (server component)
4. Server component calls `requireAuth()` → fetch current user
5. Server component calls `getTasks()`, `getStatuses()`, `getDivisions()` in parallel
6. Data passed to `TaskListOfflineWrapper` (client component)
7. Client component converts to `LocalTask` format
8. `useOfflineSync` hook syncs data to IndexedDB, loads from cache if available
9. Tasks rendered from cache or server data
10. Pull-to-refresh or sync button triggers `refreshTaskList()` server action + `syncNow()`

**Task Mutation - Status Update (Offline):**

1. User changes task status in `StatusUpdateUI`
2. Calls `updateTaskStatus` from offline hook
3. Creates pending mutation in IndexedDB via `mutation-queue.ts`
4. Local state updates immediately (optimistic)
5. Toast shows "pending" status
6. If offline, queued mutation stored
7. When online, background sync or manual `syncNow()` triggers
8. `sync-processor.ts` processes mutations FIFO
9. Checks for conflicts (server changed after mutation created)
10. If conflict detected, shows conflict UI for resolution
11. If successful, mutation deleted from queue
12. Task refreshed from server or cache updated

**Admin Data Management:**

1. Admin navigates to `/admin/dashboard` → middleware checks `user.role === 'admin'`
2. `requireAdmin()` enforces role check, redirects to `/tasks` if not admin
3. Admin page fetches related data (e.g., `getDashboardStats()`)
4. Admin makes changes via forms (e.g., create customer)
5. Form submission calls server action (`createCustomer`)
6. Server action validates, inserts to Supabase
7. Client receives success response, updates local state
8. No offline queue for admin actions (field users only)

**PWA Background Sync:**

1. Service worker detects online status change
2. Triggers `use-background-sync.ts` hook
3. Calls `syncNow()` from mutation queue processor
4. Background sync API notified (fallback to manual poll)

## State Management Strategy

**Server State (Source of Truth):**
- Stored in Supabase PostgreSQL
- Fetched via server actions and pages
- Accessed through `createClient()` from `lib/supabase/server.ts`

**Client Cache (Offline Display):**
- IndexedDB via Dexie.js (`lib/offline/db.ts`)
- Mirrors Supabase tables: tasks, statuses, divisions, comments, photos, files
- Synced on initial page load and manual refresh
- Queried via `getAllFromLocal()`, `saveToLocal()`

**Mutation Queue (Pending Changes):**
- Stored in IndexedDB as pending mutations
- Types: status, comment, photo, file
- Processed in FIFO order when online
- Conflict metadata tracked: `ConflictInfo` with server state comparison

**UI State (Ephemeral):**
- Managed with `useState` in client components
- Form inputs, modals, toast notifications, sync progress
- No persistence required

## Key Abstractions

**Task with Relations:**
- Purpose: Represents a task with related entities (status, division, user, job)
- Examples: `lib/tasks/actions.ts` exports `TaskWithRelations` type
- Pattern: Server actions return tasks with `status:statuses(*)`, `division:divisions(*)`, etc. via Supabase select

**Local Task (Denormalized):**
- Purpose: Task with embedded status/division info for offline display
- Examples: `lib/offline/db.ts` defines `LocalTask` type
- Pattern: Strip nested relations, embed key fields, no job data (too large)

**Offline Wrapper Components:**
- Purpose: Handle server data → cache sync → display logic
- Examples: `TaskListOfflineWrapper`, `TaskDetailOfflineWrapper`
- Pattern: Accept server data, convert to local format, use `useOfflineSync` hook, render presentation component

**Server Action Result:**
- Purpose: Standardized response from server actions
- Pattern: `{ success: boolean; data?: T; error?: string }`
- Examples: All actions in `lib/*/actions.ts` return this type

**Pending Mutation Types:**
- Purpose: Track queued changes with metadata
- Types: `PendingStatusMutation`, `PendingCommentMutation`, `PendingPhotoMutation`, `PendingFileMutation`
- Pattern: Contains payload (change details), created_at, status, conflict info
- Location: `lib/offline/db.ts`

## Entry Points

**Web App Entry - Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Browser loads http://localhost:3000
- Responsibilities: Set up fonts, PWA manifest, service worker registration, theme provider, global providers

**Authentication Entry - Middleware:**
- Location: `middleware.ts`
- Triggers: Every non-static request
- Responsibilities: Check auth session, enforce public/protected/admin routes, redirect appropriately

**Field User Entry - Tasks Page:**
- Location: `app/tasks/page.tsx`
- Triggers: Authenticated field user navigates to /tasks
- Responsibilities: Fetch tasks/statuses/divisions, pass to offline wrapper

**Admin Entry - Dashboard:**
- Location: `app/admin/dashboard/page.tsx`
- Triggers: Authenticated admin navigates to /admin/dashboard
- Responsibilities: Fetch dashboard stats, render admin layout with overview

**Task Detail Entry:**
- Location: `app/tasks/[id]/page.tsx`
- Triggers: User clicks task from list
- Responsibilities: Fetch task, photos, files, comments, checklists in parallel, pass to offline wrapper

**API Routes (Dynamic):**
- Location: `app/api/*`
- Triggers: External requests or service worker
- Examples: `app/manifest.json/route.ts` (dynamic PWA manifest), `app/icon-192/route.tsx`

**Service Worker Entry:**
- Location: `public/sw.js`
- Triggers: Page load, background sync events
- Responsibilities: Cache app shell, detect offline, trigger sync

## Error Handling

**Strategy:** Fail gracefully to offline, show conflict resolution UI, retry queued mutations.

**Patterns:**

**Server Actions:**
- Wrap in try-catch, return `ActionResult` with error message
- Example: `lib/tasks/actions.ts` - getTasks catches query errors, returns status/error

**Client Components:**
- useOfflineSync hook tracks errors in state
- Show error toast with `showError()` from `useSyncToast()`
- Retry logic in `sync-processor.ts` - retry failed mutations manually

**Conflict Handling:**
- `sync-processor.ts` compares server `updated_at` vs mutation `created_at`
- If server changed after mutation, mark as conflict
- Show `ConflictResolution` UI component for user to choose: keep local, use server, or merge
- User choice updates mutation with resolution metadata

**Network Errors:**
- `useOnlineStatus()` hook detects offline
- Prevents refresh/sync when offline
- Shows "offline" indicator and falls back to cache

**Validation Errors:**
- Server actions validate before insert/update
- Return error message in ActionResult
- Client component displays error toast
- Example: Search escaping in `lib/tasks/actions.ts` prevents SQL injection

## Cross-Cutting Concerns

**Logging:**
- No centralized logging library
- console.log/error used in development
- Could add Sentry/LogRocket for production monitoring

**Validation:**
- Server actions validate input before Supabase calls
- Example: `validSortColumns` array in `getTasks()` prevents invalid sort orders
- SQL injection protection: `search` parameter escaped with `.replace(/[%_\\]/g, '\\$&')`
- Type safety via TypeScript and database.types.ts

**Authentication:**
- Supabase Auth (email/password)
- Session stored in cookies, managed by `@supabase/ssr`
- Middleware refreshes tokens automatically
- Server actions call `createClient()` which reads cookies from request

**Authorization:**
- Role-based: 'admin' vs 'field_user'
- Middleware enforces `/admin/*` routes → admin only
- Server actions call `requireAdmin()` or `requireAuth()` to guard
- Supabase Row-Level Security (RLS) enforces at DB level (schema not shown)

**Data Consistency:**
- Optimistic updates in offline mode
- Conflict detection on sync for status/comment/photo/file changes
- Deduplication: mutations marked with `force_overwrite` flag for admin override

**Security:**
- Next.js security headers (CSP, XSS, Clickjacking via `next.config.ts`)
- Referrer-Policy, Permissions-Policy (camera allowed, microphone denied)
- HSTS enabled for HTTPS
- Supabase SSR for secure cookie handling

**Accessibility:**
- Touch-first design with 48px/64px tap targets (`--tap-target-min`, `--tap-target-primary`)
- OKLCH color space for perceptual uniformity
- Dark mode support
- Lucide React icons (accessible by default)
- Form labels via Radix UI components

---

*Architecture analysis: 2026-01-22*
