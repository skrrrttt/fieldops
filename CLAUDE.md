# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint check
npm run typecheck  # TypeScript validation (tsc --noEmit)
```

## Tech Stack

- **Next.js 16** with App Router (React 19, TypeScript 5)
- **Supabase** for auth, database (PostgreSQL with RLS), and storage
- **Tailwind CSS 4** with shadcn/ui components
- **Dexie.js** for IndexedDB (offline storage)

## UI & Styling

### shadcn/ui
- **Style**: `new-york` (see `components.json`)
- **Icon library**: Lucide React
- **Components live in**: `components/ui/` (auto-generated, don't edit manually)
- **Add components**: `npx shadcn@latest add <component>`

### Design System (see `app/globals.css`)
- **Color space**: OKLCH for perceptually uniform colors
- **Palette**: Electric blue (`--electric-*`) and cyan (`--cyan-*`)
- **Dark mode**: Class-based (`.dark` on html element)
- **Typography**: Sora (headings), DM Sans (body), DM Mono (code)

### Touch-First Mobile Design
- Minimum tap target: `48px` (`--tap-target-min`)
- Primary actions: `64px` (`--tap-target-primary`)
- Use `.touch-target` or `.touch-target-primary` classes

### Utility Classes
- `.glass` / `.glass-border` - Glass morphism effect
- `.gradient-electric` - Primary gradient
- `.text-gradient-electric` - Gradient text
- `.animate-fade-in`, `.animate-fade-up`, `.animate-scale-in` - Animations
- `.mobile-only` / `.desktop-only` - Responsive visibility
- `.skeleton-shimmer` - Loading state

## Architecture Overview

### App Structure

- `app/` - Next.js App Router pages and API routes
- `app/tasks/` - Field user task management interface
- `app/admin/` - Admin dashboard (divisions, statuses, users, branding, templates)
- `components/` - React components organized by feature
- `components/ui/` - shadcn/ui primitives (auto-generated)
- `lib/` - Business logic, server actions, utilities
- `public/` - PWA assets (manifest, service worker, icons)

### Key Patterns

**Server Actions**: All data mutations use Next.js Server Actions in `lib/*/actions.ts`:
```typescript
'use server';
export async function createTask(...) { ... }
```

**Authentication Guards**: Use `requireAuth()` or `requireAdmin()` from `lib/auth/actions.ts` in server components/actions.

**Offline-First**: The app uses a mutation queue pattern:
1. Actions attempt server → fall back to IndexedDB queue
2. Background Sync API processes queue when online
3. Conflict resolution UI handles merge conflicts

Key offline files:
- `lib/offline/db.ts` - Dexie schema
- `lib/offline/mutation-queue.ts` - Pending changes
- `lib/offline/sync-processor.ts` - Sync logic
- `components/offline/` - Status indicators and conflict UI

**Branding Context**: White-label settings (logo, colors, app name) flow through `BrandingContext`:
- Server fetches from Supabase in root layout
- Client caches in localStorage for offline
- CSS custom properties: `--brand-primary`, `--brand-accent`

### Database Schema

Primary tables: `users`, `tasks`, `statuses`, `divisions`, `custom_fields`, `comments`, `photos`, `files`, `branding`, `task_templates`

Storage buckets: `photos`, `files`, `branding`

### Role-Based Access

- **Field users**: See `/tasks` interface
- **Admins**: See `/admin` dashboard + all field user features
- Middleware enforces routing, server actions check `role` column

## Import Aliases

```typescript
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## PWA Notes

- Service worker at `/public/sw.js` caches app shell
- Dynamic manifest at `/app/manifest.json/route.ts` uses branding
- Install prompt component at `components/pwa/pwa-install-prompt.tsx`

## Testing with Playwright

**Production URL**: https://fieldops-one.vercel.app

**Test Accounts**:
- **Admin**: admin@fieldops.com / admin1234
- **Field User**: test@fieldops.com / admin1234

Use the Playwright MCP tools to test against the Vercel deployment.
