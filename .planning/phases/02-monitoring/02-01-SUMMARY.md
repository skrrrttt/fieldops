---
phase: 02-monitoring
plan: 01
subsystem: monitoring
tags: [sentry, error-tracking, offline, web-vitals, observability]

# Dependency graph
requires:
  - phase: 01-testing-foundation
    provides: Test infrastructure for offline systems
provides:
  - Sentry SDK integration for error tracking
  - Offline error buffering via IndexedDB
  - Web Vitals monitoring (LCP, INP, CLS)
  - Global error boundary for unhandled exceptions
affects: [02-02-sync-dashboard, 03-core-sync, 04-progressive-enhancement]

# Tech tracking
tech-stack:
  added: ["@sentry/nextjs@10.36.0"]
  patterns:
    - "Offline transport for error buffering"
    - "Breadcrumb filtering for signal-to-noise"
    - "Source map upload with deletion"

key-files:
  created:
    - instrumentation-client.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - instrumentation.ts
    - app/global-error.tsx
  modified:
    - next.config.ts
    - package.json

key-decisions:
  - "Type assertion for transportOptions to enable offline transport options"
  - "Breadcrumb filtering keeps only error/warning console messages"
  - "10% sample rate in production, 100% in development for Web Vitals"
  - "Source maps deleted after upload for security"

patterns-established:
  - "Sentry init in dedicated config files per runtime"
  - "instrumentation.ts as Next.js instrumentation entry point"
  - "Global error boundary captures root-level exceptions"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 02 Plan 01: Sentry SDK Integration Summary

**Sentry error tracking with offline IndexedDB buffering (maxQueueSize: 100), automatic Web Vitals collection, and source map upload/deletion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T23:12:11Z
- **Completed:** 2026-01-23T23:15:47Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Installed @sentry/nextjs with offline transport for error buffering
- Configured client/server/edge runtime Sentry initialization
- Created global error boundary for unhandled exception capture
- Enabled Web Vitals tracking (LCP, INP, CLS) via tracesSampleRate
- Set up source map upload with automatic deletion for security

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sentry SDK and create configuration files** - `cce26fa9` (feat)
2. **Task 2: Wrap Next.js config and create error boundary** - `4bd422a6` (feat)
3. **Task 3: Verify Sentry initialization** - No commit (verification only)

## Files Created/Modified
- `instrumentation-client.ts` - Client-side Sentry init with offline transport
- `sentry.server.config.ts` - Server-side Sentry init for Node.js runtime
- `sentry.edge.config.ts` - Edge runtime Sentry init
- `instrumentation.ts` - Next.js instrumentation entry point with runtime detection
- `app/global-error.tsx` - Root error boundary capturing unhandled exceptions
- `next.config.ts` - Wrapped with withSentryConfig for build integration
- `package.json` - Added @sentry/nextjs dependency

## Decisions Made
- **Type assertion for transportOptions:** Used `as Record<string, unknown>` to pass offline transport options (maxQueueSize, flushAtStartup) since TypeScript types don't expose BrowserOfflineTransportOptions at package level
- **Breadcrumb filtering:** Only keep error and warning level console breadcrumbs to reduce noise in Sentry
- **Sample rates:** 10% in production for performance monitoring, 100% in development for debugging
- **Source map security:** Delete source maps after upload to prevent exposure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript type error for transportOptions**
- **Found during:** Task 2 (build verification)
- **Issue:** `maxQueueSize` and `flushAtStartup` not recognized in transportOptions type
- **Fix:** Added type assertion `as Record<string, unknown>` to bypass strict typing
- **Files modified:** instrumentation-client.ts
- **Verification:** Build passes with type assertion
- **Committed in:** 4bd422a6 (Task 2 commit)

**2. [Rule 3 - Blocking] Added onRouterTransitionStart export**
- **Found during:** Task 2 (build warning)
- **Issue:** Sentry SDK warned about missing navigation instrumentation hook
- **Fix:** Added `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart` to instrumentation-client.ts
- **Files modified:** instrumentation-client.ts
- **Verification:** Build warning resolved
- **Committed in:** 4bd422a6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both blocking)
**Impact on plan:** Both fixes necessary for successful build. No scope creep.

## Issues Encountered
- Pre-existing lint errors in codebase (unrelated to Sentry integration) - documented but not addressed as out of scope

## User Setup Required

**External services require manual configuration.** The following Sentry environment variables must be set:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Dashboard -> Settings -> Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` | Sentry Dashboard -> Settings -> Auth Tokens -> Create New Token (project:write scope) |
| `SENTRY_ORG` | Sentry Dashboard -> Settings -> Organization Slug |
| `SENTRY_PROJECT` | Sentry Dashboard -> Settings -> Project Slug |

**Dashboard setup:**
1. Create Sentry project: Sentry Dashboard -> Projects -> Create Project -> Next.js

**Verification:**
```bash
# Test build with source map upload
npm run build
# Should see source map upload logs if SENTRY_AUTH_TOKEN is set
```

## Next Phase Readiness
- Error tracking foundation complete
- Offline errors buffered in IndexedDB and sent when online
- Ready for sync dashboard (02-02) to visualize sync health
- Web Vitals data available for performance monitoring

---
*Phase: 02-monitoring*
*Completed: 2026-01-23*
