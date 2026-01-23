import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Use offline transport to buffer errors when offline
  // Options: maxQueueSize (default 30), flushAtStartup (default false)
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
  transportOptions: {
    // Maximum number of envelopes to store in IndexedDB
    maxQueueSize: 100,
    // Flush stored events on startup when online
    flushAtStartup: true,
  } as Record<string, unknown>,

  // Sample rate for performance monitoring (enables Web Vitals)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter console breadcrumbs to only include errors and warnings
  beforeBreadcrumb(breadcrumb) {
    // Only filter console breadcrumbs
    if (breadcrumb.category === "console") {
      // Keep only error and warning levels
      if (breadcrumb.level !== "error" && breadcrumb.level !== "warning") {
        return null;
      }
    }
    return breadcrumb;
  },
});

// Export for Next.js App Router navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
