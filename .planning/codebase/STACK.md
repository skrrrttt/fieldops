# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5 - All source code (.ts, .tsx files)
- JavaScript - Configuration files (.mjs, .js)

**Secondary:**
- CSS - Global styles and Tailwind CSS in `app/globals.css`

## Runtime

**Environment:**
- Node.js - Version not explicitly specified in repository

**Package Manager:**
- npm - `package-lock.json` present (lockfile version 3)

## Frameworks

**Core:**
- Next.js 16.1.1 - App Router with React 19, Server Actions
- React 19.2.3 - Component framework
- React DOM 19.2.3 - DOM rendering

**Styling & UI:**
- Tailwind CSS 4 - Utility-first CSS with PostCSS plugin (@tailwindcss/postcss ^4)
- shadcn/ui 3.6.3 - Component library (style: `new-york`, icons: Lucide)
- Lucide React 0.562.0 - Icon library

**Database & Offline:**
- Dexie.js 4.2.1 - IndexedDB wrapper for offline-first storage and sync
- @supabase/supabase-js 2.90.1 - Supabase client for PostgreSQL and auth
- @supabase/ssr 0.8.0 - Server-side rendering support for Supabase auth

**UI Primitives:**
- @radix-ui/* (multiple packages ^1.1-2.2) - Headless UI components:
  - Alert Dialog, Avatar, Checkbox, Dialog, Dropdown Menu
  - Label, Popover, Progress, Scroll Area, Select
  - Separator, Slot, Switch, Tabs, Tooltip

**Utilities:**
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.0 - Merge Tailwind classes safely

**Build/Dev:**
- TypeScript 5 - Type checking (tsc --noEmit)
- ESLint 9 - Linting (eslint-config-next, eslint-config-next/core-web-vitals)
- Sharp 0.34.5 - Image processing (EXIF, resizing, compression)
- JSZip 3.10.1 - ZIP file handling

**Development Utilities:**
- tw-animate-css 1.4.0 - Tailwind animation utilities

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Core backend for auth, database (PostgreSQL), and file storage
- dexie 4.2.1 - Essential for offline-first architecture and IndexedDB persistence
- @supabase/ssr 0.8.0 - Enables authenticated server components and actions

**Infrastructure:**
- next 16.1.1 - Full framework runtime
- react 19.2.3 - Component library
- tailwindcss 4 - CSS generation and processing
- sharp 0.34.5 - Photo processing (EXIF, watermarking, compression)

## Configuration

**Environment:**
- .env.local (development) - Contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- .env.example - Template for required environment variables
- No secrets in .env files - public keys only (anon key uses Supabase RLS)

**Build Configuration:**
- `next.config.ts` - Image optimization for Supabase storage domains (*.supabase.co)
- Security headers enabled: HSTS, X-Frame-Options, CSP via Permissions-Policy
- Remote image patterns configured for Supabase storage

**TypeScript:**
- `tsconfig.json` - ES2017 target, strict mode enabled, module resolution bundler
- Path alias: `@/*` → root directory for absolute imports

**Styling:**
- `postcss.config.mjs` - PostCSS configuration for Tailwind CSS 4
- `app/globals.css` - Design system with OKLCH color space, custom properties for branding
- `components.json` - shadcn/ui configuration (style: new-york, icon: lucide)

**Linting:**
- `eslint.config.mjs` - ESLint with Next.js core web vitals and TypeScript support

## Platform Requirements

**Development:**
- Node.js (version not specified, use LTS recommended)
- npm (compatible with Node.js)

**Production:**
- Deployment target: Vercel (Next.js native deployment)
- Supports standalone deployment via `next build` + `next start`
- Service worker (`sw.js`) for PWA caching strategy

---

*Stack analysis: 2026-01-22*
