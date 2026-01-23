---
status: complete
phase: 02-monitoring
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-01-23T23:30:00Z
updated: 2026-01-23T23:31:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sentry Configuration Files Exist
expected: Running `ls instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts app/global-error.tsx` shows all 5 files exist in the project.
result: pass

### 2. Offline Transport Configuration
expected: Opening `instrumentation-client.ts` shows `makeBrowserOfflineTransport` with `maxQueueSize: 100` and `flushAtStartup: true` configured.
result: pass

### 3. Web Vitals Enabled
expected: Opening `instrumentation-client.ts` shows `tracesSampleRate` configured (0.1 for production, 1.0 for development), which enables automatic Web Vitals collection.
result: pass

### 4. Global Error Boundary
expected: Opening `app/global-error.tsx` shows a component that calls `Sentry.captureException(error)` and displays a "Something went wrong!" error UI with a reset button.
result: pass

### 5. Sentry Helper Functions
expected: Opening `lib/monitoring/sentry.ts` shows exports for `setSyncContext`, `setSentryUser`, `clearSentryUser`, `trackSyncMetrics`, and `updateSyncContextOnNetworkChange`.
result: pass

### 6. Sync Metrics Integration
expected: Opening `lib/offline/sync-processor.ts` and searching for `trackSyncMetrics` shows it's imported from monitoring/sentry and called after sync completion.
result: pass

### 7. User Context on Login
expected: Opening `app/login/page.tsx` and searching for `setSentryUser` shows it's called after successful authentication with user id and email.
result: pass

### 8. User Context on Logout
expected: Opening `components/auth/logout-button.tsx` and searching for `clearSentryUser` shows it's called before signing out.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
