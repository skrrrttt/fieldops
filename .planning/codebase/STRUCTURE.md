# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
/Users/luke/Desktop/testcodd/
├── app/                               # Next.js App Router pages and routes
│   ├── layout.tsx                    # Root layout (fonts, PWA, providers)
│   ├── page.tsx                      # Root redirect handler
│   ├── login/                        # Authentication
│   │   └── page.tsx
│   ├── tasks/                        # Field user task management
│   │   ├── page.tsx                 # Task list
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Task detail
│   │   │   ├── status/page.tsx     # Quick status update
│   │   │   └── loading.tsx
│   │   └── loading.tsx
│   ├── admin/                        # Admin dashboard (role-protected)
│   │   ├── dashboard/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── jobs/page.tsx
│   │   ├── tasks/page.tsx           # Admin task management
│   │   ├── archive/page.tsx
│   │   ├── checklists/page.tsx
│   │   ├── responses/page.tsx
│   │   ├── divisions/page.tsx
│   │   ├── statuses/page.tsx
│   │   ├── users/page.tsx
│   │   ├── custom-fields/page.tsx
│   │   └── media/page.tsx
│   ├── profile/page.tsx
│   ├── upload/page.tsx               # Bulk upload handler
│   ├── manifest.json/route.ts        # Dynamic PWA manifest
│   ├── icon-192/route.tsx            # Dynamic icon routes
│   ├── icon-512/route.tsx
│   ├── apple-icon.tsx
│   ├── icon.tsx
│   ├── globals.css                   # Design system, CSS variables
│   └── api/                          # API routes (if any)
│
├── components/                        # React components (feature-organized)
│   ├── ui/                           # shadcn/ui primitives (auto-generated)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── [20+ more UI components]
│   ├── tasks/                        # Task-related components
│   │   ├── task-list.tsx            # Main task list presentation
│   │   ├── task-list-offline-wrapper.tsx  # Server data + offline cache
│   │   ├── task-card.tsx            # Individual task card
│   │   ├── task-detail.tsx          # Task detail view
│   │   ├── task-detail-offline-wrapper.tsx
│   │   ├── status-update-ui.tsx
│   │   ├── comment-input.tsx
│   │   ├── comment-list.tsx
│   │   ├── photo-upload.tsx
│   │   ├── photo-gallery.tsx
│   │   ├── file-upload.tsx
│   │   ├── file-list.tsx
│   │   ├── custom-field-edit.tsx
│   │   └── task-checklist.tsx
│   ├── admin/                        # Admin-specific components
│   │   ├── admin-layout.tsx          # Admin page wrapper
│   │   ├── dashboard/
│   │   │   └── dashboard-content.tsx
│   │   ├── customers/
│   │   │   ├── customer-list.tsx
│   │   │   ├── create-customer-form.tsx
│   │   │   └── customer-detail-modal.tsx
│   │   ├── tasks/
│   │   │   ├── task-table.tsx
│   │   │   ├── task-modal.tsx
│   │   │   ├── task-media-panel.tsx
│   │   │   └── quick-add-customer-job.tsx
│   │   ├── users/user-table.tsx
│   │   ├── divisions/
│   │   ├── statuses/
│   │   ├── custom-fields/
│   │   ├── checklists/checklist-list.tsx
│   │   ├── archive/task-history-list.tsx
│   │   ├── media/media-gallery.tsx
│   │   └── responses/
│   ├── offline/                      # Offline status & sync UI
│   │   ├── offline-indicator.tsx
│   │   ├── connection-indicator.tsx
│   │   ├── sync-status-indicator.tsx
│   │   ├── pending-changes-indicator.tsx
│   │   ├── sync-now-button.tsx
│   │   ├── sync-toast.tsx
│   │   ├── pull-to-refresh.tsx
│   │   └── conflict-resolution.tsx
│   ├── layout/                       # Layout components (headers, nav)
│   │   ├── app-header.tsx
│   │   └── mobile-bottom-nav.tsx
│   ├── auth/
│   │   └── logout-button.tsx
│   ├── profile/
│   │   └── profile-menu.tsx
│   ├── providers/
│   │   └── branding-provider-wrapper.tsx
│   ├── theme/
│   │   └── theme-toggle.tsx
│   └── pwa/                          # PWA installation & splash
│       ├── service-worker-registration.tsx
│       ├── pwa-install-prompt.tsx
│       └── pwa-splash-screen.tsx
│
├── lib/                              # Business logic, server actions, utilities
│   ├── database.types.ts             # TypeScript types for Supabase schema
│   ├── auth/
│   │   └── actions.ts                # Auth: getCurrentUser, requireAuth, requireAdmin
│   ├── tasks/
│   │   └── actions.ts                # Task CRUD: getTasks, getTask, updateTaskStatus, etc.
│   ├── customers/
│   │   └── actions.ts                # Customer/Job: getCustomers, createCustomer, etc.
│   ├── jobs/
│   │   └── actions.ts
│   ├── comments/
│   │   └── actions.ts                # Comment: getTaskComments, createComment, etc.
│   ├── photos/
│   │   ├── actions.ts
│   │   └── process-photo.ts          # Photo resizing/compression
│   ├── files/
│   │   └── actions.ts                # File upload/download
│   ├── custom-fields/
│   │   └── actions.ts
│   ├── checklists/
│   │   └── actions.ts                # Checklist items: getChecklists, updateChecklist, etc.
│   ├── divisions/
│   │   └── actions.ts
│   ├── statuses/
│   │   └── actions.ts
│   ├── users/
│   │   └── actions.ts
│   ├── dashboard/
│   │   └── actions.ts                # Dashboard stats
│   ├── task-history/
│   │   └── actions.ts                # Archived tasks
│   ├── profile/
│   │   └── actions.ts                # User profile
│   ├── offline/                      # Offline-first implementation
│   │   ├── db.ts                     # Dexie schema (LocalTask, LocalComment, etc.)
│   │   ├── index.ts                  # Exports and initialization
│   │   ├── helpers.ts                # saveToLocal, getFromLocal, deleteFromLocal
│   │   ├── mutation-queue.ts         # Queue operations (add, get, update, delete mutations)
│   │   ├── sync-processor.ts         # Process mutations FIFO with conflict detection
│   │   ├── use-offline-sync.ts       # Hook: load cache, sync server data, track state
│   │   ├── use-background-sync.ts    # Hook: background sync on reconnect
│   │   ├── use-manual-refresh.ts     # Hook: manual refresh
│   │   └── use-task-offline.ts       # Hook: task-specific offline mutations
│   ├── supabase/
│   │   ├── server.ts                 # Server-side Supabase client (reads cookies)
│   │   ├── client.ts                 # Client-side Supabase client
│   │   └── middleware.ts             # Session refresh for middleware
│   ├── theme/
│   │   └── theme-context.tsx         # Dark mode provider
│   └── utils/
│       └── [utility functions]       # General helpers
│
├── public/                           # Static PWA assets
│   ├── manifest.json                 # PWA manifest (also dynamic at app/manifest.json/route.ts)
│   ├── sw.js                         # Service worker
│   ├── apple-touch-icon.png
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── [other static assets]
│
├── supabase/                         # Supabase project config (schema, RLS, migrations)
│   ├── config.toml
│   └── migrations/
│
├── scripts/                          # Build/automation scripts
│
├── middleware.ts                     # Next.js middleware (auth, routing)
├── next.config.ts                    # Next.js config (security headers, image optimization)
├── tsconfig.json                     # TypeScript config (paths: @/*)
├── package.json                      # Dependencies
├── components.json                   # shadcn/ui config
├── eslint.config.mjs                 # ESLint rules
├── CLAUDE.md                         # Project guidelines
├── README.md                         # Project documentation
└── .env.local / .env.example         # Environment variables
```

## Directory Purposes

**`app/`** - Next.js App Router pages and API routes
- Server components by default
- Organize by feature/route (tasks, admin, auth, etc.)
- Each directory can have `page.tsx` (renders as route), `layout.tsx` (wraps children), `loading.tsx`, `error.tsx`

**`components/`** - Reusable React components
- Client and server components mixed
- Organized by feature, not by type (no separate components/buttons/, components/modals/)
- `ui/` contains shadcn/ui primitives (auto-generated, never edit manually)
- Each feature folder mirrors a section of app (tasks, admin, etc.)

**`lib/`** - Business logic and server actions
- All data mutations via Server Actions in `lib/*/actions.ts`
- Feature folders match app/components structure (tasks, customers, etc.)
- `offline/` contains offline-first implementation (Dexie, sync processor)
- `supabase/` contains Supabase client setup (server vs client)
- `auth/` and `theme/` are cross-cutting

**`public/`** - Static assets and PWA files
- `sw.js` - Service worker for caching and offline support
- `manifest.json` - PWA metadata (also dynamically generated at app/manifest.json/route.ts)
- Icon files for PWA installation

**`supabase/`** - Database schema and migrations
- Local development setup and production schema

## Key File Locations

**Entry Points:**

- `app/layout.tsx` - Root layout with fonts, providers, PWA setup
- `middleware.ts` - Auth enforcement and routing guards
- `public/sw.js` - Service worker for offline support
- `app/manifest.json/route.ts` - Dynamic PWA manifest

**Configuration:**

- `tsconfig.json` - Path alias `@/*` points to project root
- `next.config.ts` - Security headers, image optimization, Supabase remote patterns
- `components.json` - shadcn/ui style (new-york), icon library (lucide)
- `CLAUDE.md` - Project guidelines and stack summary

**Core Logic:**

- `lib/auth/actions.ts` - User auth: getCurrentUser, requireAuth, requireAdmin
- `lib/tasks/actions.ts` - Task CRUD operations (getTasks, getTask, updateTaskStatus, etc.)
- `lib/offline/db.ts` - Dexie schema for IndexedDB caching
- `lib/offline/sync-processor.ts` - Background sync with conflict detection
- `lib/offline/use-offline-sync.ts` - Hook to manage offline state and cache

**Database Types:**

- `lib/database.types.ts` - TypeScript types for all Supabase tables (User, Task, Status, Division, Customer, Job, Comment, Photo, File, CustomFieldDefinition, Checklist, TaskHistory, Branding)

**Page Routes:**

- `app/tasks/page.tsx` - Field user task list
- `app/tasks/[id]/page.tsx` - Task detail view
- `app/admin/dashboard/page.tsx` - Admin overview
- `app/admin/customers/page.tsx` - Manage customers & jobs
- `app/admin/tasks/page.tsx` - Admin task management
- `app/admin/users/page.tsx` - User management
- `app/login/page.tsx` - Authentication

**Component Routes:**

- `components/tasks/task-list.tsx` - Renders task array as cards
- `components/tasks/task-detail.tsx` - Full task view with comments, photos, files
- `components/tasks/task-list-offline-wrapper.tsx` - Wraps with offline sync logic
- `components/admin/admin-layout.tsx` - Shared admin page wrapper
- `components/offline/conflict-resolution.tsx` - Conflict resolution UI

**Styling:**

- `app/globals.css` - Design system: OKLCH colors (`--electric-*`, `--cyan-*`), typography (Sora, DM Sans, DM Mono), custom properties
- Font imports via Google Fonts in `app/layout.tsx`
- Tailwind CSS 4 with `@/components/ui` components

## Naming Conventions

**Files:**

- **Page files:** `page.tsx` for routes, `layout.tsx` for wrappers
- **Components:** `PascalCase.tsx` (e.g., `TaskCard.tsx`, `AdminLayout.tsx`)
- **Server actions:** `actions.ts` in feature directories (e.g., `lib/tasks/actions.ts`)
- **Hooks:** `use[Name].ts` (e.g., `use-offline-sync.ts`, `use-background-sync.ts`)
- **Utilities:** `camelCase.ts` (e.g., `process-photo.ts`, `helpers.ts`)
- **Types file:** `database.types.ts` for Supabase schema types

**Directories:**

- **Feature folders:** `kebab-case`, match route names (e.g., `tasks/`, `admin/`, `offline/`, `custom-fields/`)
- **No index files:** Explicit imports, no barrel exports (components don't use index.ts except offline/)

**Components:**

- **Client components:** marked with `'use client'` at top
- **Server components:** no directive (default in App Router)
- **Naming:** Describe what they render or do (e.g., `TaskCard`, `CommentInput`, `SyncStatusIndicator`)

**Server Actions:**

- **Naming:** Verb + noun (e.g., `getTasks`, `updateTaskStatus`, `createComment`, `deleteFile`)
- **Return type:** `ActionResult<T>` or `Promise<SomeData>` for queries
- **Always in:** `lib/[feature]/actions.ts` files marked with `'use server'`

**Types:**

- **Database tables:** Match Supabase table names (e.g., `Task`, `Status`, `Division`, `Comment`)
- **Local versions:** `Local` prefix (e.g., `LocalTask`, `LocalComment`)
- **Mutations:** `Pending[Type]Mutation` (e.g., `PendingStatusMutation`, `PendingCommentMutation`)

**Hooks:**

- **Offline hooks:** `use[Feature]Offline` or `use[Feature]Sync` (e.g., `useOfflineSync`, `useTaskOffline`)
- **React hooks:** Standard naming (e.g., `useState`, `useEffect`, `useCallback`)

## Where to Add New Code

**New Feature (Task-related):**
- Primary code: `lib/tasks/actions.ts` (server actions for fetching/mutating)
- Components: `components/tasks/[ComponentName].tsx`
- Types: Add to `lib/database.types.ts` if schema changes
- Tests: Co-locate as `[file].test.ts` alongside code
- Page routes: Create in `app/tasks/[route]/page.tsx` if new route needed

**New Admin Feature:**
- Primary code: `lib/[feature]/actions.ts` (e.g., `lib/divisions/actions.ts`)
- Components: `components/admin/[feature]/[ComponentName].tsx`
- Page route: `app/admin/[feature]/page.tsx`
- Layout: Wrap with `AdminLayout` from `components/admin/admin-layout.tsx`

**New Offline Feature (Local Storage, Mutations):**
- Mutation queue logic: Extend `lib/offline/db.ts` with new mutation type
- Sync processor: Add case in `lib/offline/sync-processor.ts` to handle new mutation
- Hook: Create `lib/offline/use[Feature]Offline.ts` for component integration
- Component wrapper: `components/[feature]/[Feature]OfflineWrapper.tsx` to manage server data + cache

**New Utility Function:**
- Shared helpers: `lib/utils/[name].ts`
- Feature-specific: `lib/[feature]/[name].ts`

**New UI Component (shadcn/ui):**
- Never edit `components/ui/` manually
- Use: `npx shadcn@latest add [component]` to generate
- Customize via Tailwind classes in components that use it

**New shadcn/ui Component (custom variant):**
- Create in: `components/[feature]/[ComponentName].tsx` (not in ui/)
- Compose: Use multiple `components/ui/*` primitives

## Special Directories

**`lib/offline/`:**
- Purpose: Offline-first IndexedDB caching and mutation queue
- Generated: No (all handwritten)
- Committed: Yes
- Key files:
  - `db.ts` - Dexie schema, types (LocalTask, LocalComment, etc.)
  - `mutation-queue.ts` - CRUD operations on pending mutations
  - `sync-processor.ts` - Process queue FIFO, conflict detection
  - `use-offline-sync.ts` - React hook to manage cache and sync state
  - `use-task-offline.ts` - Task-specific mutation hook for status/comment/photo/file

**`components/ui/`:**
- Purpose: shadcn/ui primitives (Button, Dialog, Select, etc.)
- Generated: Yes (auto-generated by `npx shadcn@latest add`)
- Committed: Yes (committed to repo)
- Edit: Never manually edit; regenerate with shadcn CLI if changes needed

**`public/`:**
- Purpose: Static PWA assets served directly
- Generated: No (manifest.json also generated dynamically at app/manifest.json/route.ts)
- Committed: Yes
- Service Worker: `sw.js` - Manually written for caching strategy

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (created during `npm run build`)
- Committed: No (.gitignore)

**`supabase/`:**
- Purpose: Local Supabase project config
- Generated: Yes (via `supabase init`)
- Committed: Yes (schema and migrations)

## Import Patterns

**Recommended import order:**
```typescript
// 1. External packages
import { useState } from 'react';
import { Button } from '@radix-ui/react-button';

// 2. Internal lib (server actions, utilities)
import { getTasks } from '@/lib/tasks/actions';
import { useOfflineSync } from '@/lib/offline';

// 3. Internal components
import { TaskCard } from '@/components/tasks/task-card';
import { TaskList } from '@/components/tasks/task-list';

// 4. Types
import type { Task, Status } from '@/lib/database.types';
```

**Path aliases (from `tsconfig.json`):**
- `@/` - Project root
- No other aliases configured
- Always use `@/lib/`, `@/components/` instead of relative paths

---

*Structure analysis: 2026-01-22*
