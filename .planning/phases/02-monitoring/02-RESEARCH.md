# Phase 2: Monitoring - Research

**Researched:** 2026-01-23
**Domain:** Error tracking, performance monitoring, offline-first observability
**Confidence:** HIGH

## Summary

This phase adds production observability to the offline sync layer using Sentry as the unified monitoring platform. The research confirms Sentry provides all required capabilities: error tracking with offline buffering via `makeBrowserOfflineTransport`, automatic Core Web Vitals collection via BrowserTracing integration, and custom metrics for sync telemetry via `Sentry.metrics.*` APIs.

The key architectural insight is that Sentry's built-in offline transport uses IndexedDB internally, matching the existing offline infrastructure. The SDK's `maxQueueSize` (default 30) is lower than the user's requirement of 100 errors, so this must be configured explicitly. The `flushAtStartup: true` option ensures buffered errors are sent when the app reconnects.

**Primary recommendation:** Use `@sentry/nextjs` v10.35+ with `makeBrowserOfflineTransport`, configure `maxQueueSize: 100`, enable BrowserTracing for automatic Web Vitals, and use `Sentry.metrics.count()` for sync metrics. Every error should include custom context with `isOnline`, `pendingMutationCount`, and `lastSyncTime`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @sentry/nextjs | ^10.35.0 | Error tracking, performance, metrics | Official Sentry SDK for Next.js with App Router support, BrowserTracing, offline transport, and metrics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none required) | - | - | Sentry SDK includes all needed functionality |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sentry metrics | web-vitals + custom analytics | Would require separate systems for errors vs metrics; Sentry provides unified trace-connected observability |
| Sentry offline transport | Custom IndexedDB buffering | Sentry's built-in transport is well-tested and handles edge cases |

**Installation:**
```bash
npm install @sentry/nextjs
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── monitoring/
│   └── sentry.ts           # Sentry helper functions (context setters, metrics emitters)
├── offline/
│   └── db.ts               # (existing) - no changes needed, Sentry uses its own IndexedDB store
app/
├── instrumentation-client.ts  # Client-side Sentry init with offline transport
├── global-error.tsx           # App Router error boundary
sentry.server.config.ts        # Server-side Sentry init
sentry.edge.config.ts          # Edge runtime Sentry init
instrumentation.ts             # Next.js instrumentation file
next.config.ts                 # withSentryConfig wrapper
```

### Pattern 1: Offline Error Transport
**What:** Configure Sentry to buffer errors in IndexedDB when offline and flush on reconnect
**When to use:** Always in client-side configuration for PWA/offline-first apps
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/best-practices/offline-caching/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: {
    dbName: 'sentry-offline',
    storeName: 'queue',
    maxQueueSize: 100, // User requirement: 100 error limit
    flushAtStartup: true, // Send queued errors on reconnect
  },
});
```

### Pattern 2: Sync Context Attachment
**What:** Attach offline status and mutation count to every error
**When to use:** Before capturing any exception or in beforeSend hook
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/context/
import * as Sentry from "@sentry/nextjs";
import { getPendingMutationCount, getAllSyncMeta } from '@/lib/offline/mutation-queue';

export async function setSyncContext(): Promise<void> {
  const pendingCount = await getPendingMutationCount();
  const syncMeta = await getAllSyncMeta();
  const lastSync = syncMeta.length > 0
    ? Math.max(...syncMeta.map(m => new Date(m.last_synced_at).getTime()))
    : null;

  Sentry.setContext("sync", {
    isOnline: navigator.onLine,
    pendingMutationCount: pendingCount,
    lastSyncTime: lastSync ? new Date(lastSync).toISOString() : null,
  });
}
```

### Pattern 3: Sync Metrics Tracking
**What:** Emit counter metrics for sync success/failure/conflict counts
**When to use:** After each sync run completes
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/metrics/
import * as Sentry from "@sentry/nextjs";
import type { SyncProgress } from '@/lib/offline/sync-processor';

export function trackSyncMetrics(progress: SyncProgress): void {
  const successCount = progress.current - progress.errors.length - progress.conflicts.length;

  Sentry.metrics.count("sync.success_count", successCount);
  Sentry.metrics.count("sync.failure_count", progress.errors.length);
  Sentry.metrics.count("sync.conflict_count", progress.conflicts.length);

  // Distribution for total sync duration (if tracked)
  // Sentry.metrics.distribution("sync.duration", durationMs, { unit: "millisecond" });
}
```

### Pattern 4: Breadcrumb Filtering (Errors/Warnings Only)
**What:** Filter console breadcrumbs to only capture errors and warnings
**When to use:** In Sentry init to reduce noise
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
Sentry.init({
  // ... other config
  beforeBreadcrumb(breadcrumb) {
    // Only keep error and warning level breadcrumbs from console
    if (breadcrumb.category === "console") {
      if (breadcrumb.level === "info" || breadcrumb.level === "debug" || breadcrumb.level === "log") {
        return null; // Drop info/debug/log breadcrumbs
      }
    }
    return breadcrumb;
  },
});
```

### Pattern 5: User Context
**What:** Set user ID and email for error attribution
**When to use:** After user authentication
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/javascript/enriching-events/context/
import * as Sentry from "@sentry/nextjs";

export function setSentryUser(user: { id: string; email: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}
```

### Anti-Patterns to Avoid
- **Custom IndexedDB error buffer:** Don't build a separate error buffering system; Sentry's `makeBrowserOfflineTransport` already does this with proper retry logic
- **Manual Web Vitals collection:** Don't use the `web-vitals` package directly; Sentry's BrowserTracing already captures LCP, INP, CLS automatically
- **Separate metrics system:** Don't send metrics to a different service; use Sentry's trace-connected metrics for unified observability
- **Logging all console levels:** Don't capture info/debug breadcrumbs; they create noise and consume quota

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline error buffering | Custom IndexedDB queue for errors | `makeBrowserOfflineTransport` | Handles retry logic, queue limits, flush on reconnect |
| Core Web Vitals collection | Manual `web-vitals` integration | BrowserTracing integration | Auto-captures LCP, INP, CLS on pageload transactions |
| Error context injection | Manual try/catch wrappers everywhere | `beforeSend` + `setContext` | Centralized, consistent, less code |
| Source map handling | Manual upload scripts | `withSentryConfig` | Handles build-time upload, deletion after upload |

**Key insight:** Sentry's Next.js SDK is comprehensive. The temptation to build custom solutions comes from unfamiliarity with the SDK's capabilities, not actual gaps.

## Common Pitfalls

### Pitfall 1: Source Maps Publicly Accessible
**What goes wrong:** Production source maps exposed to users, revealing source code
**Why it happens:** Default Next.js config generates source maps; developers forget to configure deletion
**How to avoid:** `withSentryConfig` has `sourcemaps.deleteSourcemapsAfterUpload: true` by default; verify this isn't overridden
**Warning signs:** Can view source maps in browser DevTools on production site

### Pitfall 2: Offline Transport Not Flushing
**What goes wrong:** Errors buffered offline never get sent even after reconnect
**Why it happens:** `flushAtStartup` defaults to `false`; app doesn't trigger flush manually
**How to avoid:** Set `flushAtStartup: true` in transportOptions
**Warning signs:** Dashboard shows no errors during offline periods that definitely had failures

### Pitfall 3: Missing Sync Context on Errors
**What goes wrong:** Errors captured without offline status, making debugging impossible
**Why it happens:** Context must be set before error capture; async context can be stale
**How to avoid:** Update sync context in `beforeSend` callback or call `setSyncContext()` proactively
**Warning signs:** Error events in Sentry lack "sync" context section

### Pitfall 4: Web Vitals Not Appearing
**What goes wrong:** Web Vitals page in Sentry shows no data
**Why it happens:** `tracesSampleRate` set to 0, or BrowserTracing not included
**How to avoid:** Ensure `tracesSampleRate > 0` (recommend 0.1 for production) and BrowserTracing is in integrations
**Warning signs:** Performance > Web Vitals page is empty

### Pitfall 5: Metrics Not Trace-Connected
**What goes wrong:** Metrics appear but can't drill into related traces
**Why it happens:** Metrics emitted outside of any active span/transaction
**How to avoid:** Emit sync metrics within the sync processor's execution context
**Warning signs:** Clicking on metric spike shows no sample traces

### Pitfall 6: Auth Token in Client Bundle
**What goes wrong:** `SENTRY_AUTH_TOKEN` exposed in client JavaScript
**Why it happens:** Using wrong env var prefix or misconfigured build
**How to avoid:** `SENTRY_AUTH_TOKEN` is server-only (no `NEXT_PUBLIC_` prefix); only `NEXT_PUBLIC_SENTRY_DSN` goes to client
**Warning signs:** Auth token visible in browser source

## Code Examples

Verified patterns from official sources:

### Complete Client-Side Initialization
```typescript
// instrumentation-client.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Offline transport with IndexedDB buffering
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: {
    maxQueueSize: 100,
    flushAtStartup: true,
  },

  // Performance monitoring (enables Web Vitals)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter breadcrumbs to errors/warnings only
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console") {
      if (["info", "debug", "log"].includes(breadcrumb.level || "")) {
        return null;
      }
    }
    return breadcrumb;
  },

  // Attach sync context to every event
  async beforeSend(event) {
    // Note: This is simplified; actual implementation needs async handling
    // Consider setting context proactively instead
    return event;
  },
});
```

### Server-Side Initialization
```typescript
// sentry.server.config.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
```

### Next.js Config with Source Maps
```typescript
// next.config.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Source map options
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true, // Security: remove after upload
  },

  // Build options
  silent: !process.env.CI,
  widenClientFileUpload: true, // Better stack traces
});
```

### Instrumentation File
```typescript
// instrumentation.ts
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

### Global Error Boundary
```typescript
// app/global-error.tsx
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FID (First Input Delay) | INP (Interaction to Next Paint) | March 2024 | INP is now the Core Web Vital for responsiveness |
| Manual web-vitals library | BrowserTracing auto-collection | Sentry SDK 8.x | No need to install web-vitals separately |
| Custom metrics API | Trace-connected metrics | SDK 10.25.0 | Metrics link directly to traces for debugging |
| `BrowserTracing` integration | `browserTracingIntegration()` function | SDK 8.x | Functional API replaces class-based |
| sentry.client.config.ts | instrumentation-client.ts | Next.js 15+ | New instrumentation pattern |

**Deprecated/outdated:**
- `@sentry/tracing` package: Merged into main SDK, no longer needed
- `new BrowserTracing()`: Use `browserTracingIntegration()` instead
- `Sentry.configureScope()`: Use `Sentry.getGlobalScope()` or `Sentry.getCurrentScope()`
- FID metric: Replaced by INP as of March 2024

## Open Questions

Things that couldn't be fully resolved:

1. **Metrics alerting availability**
   - What we know: Sentry docs state "Alerts and dashboard widgets for Metrics are coming soon"
   - What's unclear: Whether this is available in 2026 or still pending
   - Recommendation: Plan to set up issue-based alerts initially; check Sentry dashboard for metrics alerting after setup

2. **Exact offline transport behavior during flush**
   - What we know: `flushAtStartup: true` sends queued events on app load
   - What's unclear: Whether online event also triggers flush, or only app restart
   - Recommendation: Test behavior manually; may need to add `navigator.onLine` listener to trigger manual flush

## Sources

### Primary (HIGH confidence)
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) - Configuration files, init patterns
- [Sentry Offline Caching](https://docs.sentry.io/platforms/javascript/guides/nextjs/best-practices/offline-caching/) - makeBrowserOfflineTransport API
- [Sentry Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/) - withSentryConfig options
- [Sentry Context](https://docs.sentry.io/platforms/javascript/enriching-events/context/) - setContext, setUser, setTag
- [Sentry Breadcrumbs](https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/) - beforeBreadcrumb filtering
- [Sentry Metrics for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/metrics/) - Sentry.metrics.* API
- [Sentry Web Vitals](https://docs.sentry.io/product/insights/frontend/web-vitals/) - Automatic collection via BrowserTracing
- [Sentry Build Options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/) - withSentryConfig full options

### Secondary (MEDIUM confidence)
- [Sentry GitHub Releases](https://github.com/getsentry/sentry-javascript/releases) - Version 10.36.0 confirmed
- [Sentry Alert Configuration](https://docs.sentry.io/product/alerts/create-alerts/metric-alert-config/) - Alert setup patterns

### Tertiary (LOW confidence)
- Metrics alerting availability claim - Needs verification in current Sentry dashboard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Sentry docs confirm all capabilities
- Architecture patterns: HIGH - Verified from official manual setup guide
- Pitfalls: MEDIUM - Some based on general Sentry knowledge, not Next.js 16 specific testing
- Metrics: MEDIUM - API confirmed but "coming soon" alerting claim needs verification

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Sentry SDK is stable)
