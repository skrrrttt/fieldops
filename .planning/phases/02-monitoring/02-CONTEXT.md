# Phase 2: Monitoring - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add production observability for the offline sync layer — error tracking, performance metrics, and sync telemetry. Developers gain visibility into sync behavior and errors, even when users are offline. Errors are buffered locally and sent when connectivity is restored.

</domain>

<decisions>
## Implementation Decisions

### Error capture scope
- Capture all JavaScript errors (global error handler)
- Include user context: user ID + email
- Breadcrumbs: errors and warnings only (skip info/debug logs)
- Every error includes sync context: isOnline, pendingMutationCount, lastSyncTime

### Offline buffering
- Store buffered errors in IndexedDB (dedicated errors table, separate from mutations)
- Buffer limit: 100 errors (drop oldest when exceeded)
- Flush trigger: on reconnect only (batch send when connectivity restored)

### Sync metrics detail
- Track counts only per sync run: success_count, failure_count, conflict_count
- Report via Sentry custom events (unified with error tracking)
- Core Web Vitals via Sentry's built-in CWV support (LCP, INP, CLS)
- No mutation IDs in metrics (just counts)

### Dashboard/alerting
- Set up basic Sentry alerts (new errors, high error rate)
- Notifications via email only
- Include Sentry project setup instructions (DSN configuration, env vars)
- Upload source maps during build for readable stack traces

### Claude's Discretion
- Exact Sentry SDK configuration options
- Alert threshold values
- Error grouping/fingerprinting rules

</decisions>

<specifics>
## Specific Ideas

- Sentry is the single destination for all observability (errors + metrics + CWV)
- Offline error buffer uses same IndexedDB infrastructure as existing offline layer
- Source maps enable debugging production errors with full context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-monitoring*
*Context gathered: 2026-01-23*
