# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Supabase (Primary Backend):**
- Authentication - Supabase Auth via JWT sessions
  - SDK: `@supabase/supabase-js 2.90.1`, `@supabase/ssr 0.8.0`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env vars)
  - Session tokens stored in cookies, refreshed via middleware
  - Role-based access control via `users.role` column (admin/field_user)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Primary tables: `users`, `tasks`, `customers`, `jobs`, `divisions`, `statuses`, `custom_fields`, `comments`, `photos`, `files`, `checklists`, `task_history`, `branding`, `responses`
  - Connection: `@supabase/supabase-js` client via `NEXT_PUBLIC_SUPABASE_URL`
  - Row-Level Security (RLS) enabled for multi-tenant isolation
  - Server client: `lib/supabase/server.ts` (Server Actions)
  - Browser client: `lib/supabase/client.ts` (Client Components)

**Offline Storage:**
- IndexedDB (via Dexie.js 4.2.1)
  - Database schema: `lib/offline/db.ts`
  - Mirrors Supabase tables locally for offline-first functionality
  - Supports denormalized relations for offline display (task + status, division, assigned_user)
  - Offline mutation queue stores pending changes
  - Conflict resolution UI for merge conflicts during sync

**File Storage:**
- Supabase Storage buckets:
  - `photos` - Task and job photos with EXIF and watermark processing
  - `files` - Task attachments and documents
  - `avatars` - User profile pictures
  - `branding` - Company logos and custom branding assets
  - Access: `supabase.storage.from(bucket)` API calls
  - Remote image URLs via `*.supabase.co/storage/v1/object/public/` (configured in `next.config.ts`)

**Caching:**
- Browser cache via Service Worker (`public/sw.js`)
  - App shell cache: CACHE_NAME = 'prostreet-v1'
  - Static assets cached: `/`, `/login`, `/tasks`, `/manifest.json`
  - Network-first strategy for dynamic content with cache fallback
  - Background Sync tag: `sync-mutations` for offline queue processing

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (Custom JWT sessions)
  - Middleware: `middleware.ts` - Session refresh and route protection
  - Server actions: `lib/auth/actions.ts` - `requireAuth()`, `requireAdmin()`, `signOut()`
  - Public routes: `/login` - No authentication required
  - Admin routes: `/admin/*` - Admin-only access with role check
  - Redirect flows: Login → `/admin/dashboard` (admin) or `/tasks` (field user)
  - User roles: `admin` | `field_user` (stored in `users.role`)

## Monitoring & Observability

**Error Tracking:**
- Console logging only - No external error tracking service detected
- Error handling via try-catch blocks in server actions
- `console.error()` used for debugging (see `lib/*/actions.ts`)

**Logs:**
- Browser console (development)
- Service Worker logs: `[SW]` prefix for diagnostics

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary production deployment
- Production URL: https://fieldops-one.vercel.app
- Next.js optimized for Vercel (native support)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or Vercel-specific workflow files found

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous API key (public, with RLS protection)

**Optional env vars:**
- None explicitly documented

**Secrets location:**
- `.env.local` - Local development (git-ignored)
- Vercel Environment Variables dashboard - Production secrets
- RLS policies enforce authorization in Supabase (no secret keys in browser)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Photo & Media Processing

**Photo Processing Pipeline:**
- Client-side processing: `lib/photos/process-photo.ts`
  - EXIF orientation handling (critical for iOS)
  - Max dimension resize: 1920px (default)
  - JPEG compression: 80% quality (default)
  - Watermarking with timestamp and GPS coordinates (optional)
  - Stores: blob, width, height, timestamp, gpsLat, gpsLng

**Offline Photo Storage:**
- LocalStorage via Dexie: `local_blob` property for offline uploads
- Sync processor queues and uploads when online

## Background Sync

**Implementation:**
- Background Sync API integration: `lib/offline/use-background-sync.ts`
- Mutation queue stores pending mutations: `lib/offline/mutation-queue.ts`
- Sync processor: `lib/offline/sync-processor.ts`
  - Replays mutations to Supabase when reconnected
  - Handles rate limiting and retry logic
  - Detects conflicts and triggers UI resolution

## PWA & Service Worker

**Service Worker:**
- File: `public/sw.js`
- Cache strategy: Network-first with cache fallback
- Install event: Caches app shell (/, /login, /tasks, /manifest.json)
- Fetch event: Serves from cache if network unavailable
- Background Sync: Tag `sync-mutations` for offline queue processing
- Clean-up: Removes old caches on activation

**Manifest:**
- Dynamic: `app/manifest.json/route.ts` (can be personalized with branding)
- Icons: 192x192 (maskable), 512x512 (maskable)
- Display: standalone (PWA mode)
- Scope: /

---

*Integration audit: 2026-01-22*
