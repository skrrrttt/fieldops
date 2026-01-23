# Phase 3: Batch Sync - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Process mutations in parallel batches instead of one-by-one. Handle rate limits with exponential backoff. Existing sync processor tests must pass with the batched implementation.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation decisions to Claude. Apply these sensible defaults:

**Batch grouping:**
- Separate queues for data mutations vs photo uploads (different rate limits, different failure modes)
- Data mutations: batch by table when possible (enables potential future bulk operations)
- Photos: process separately with lower concurrency (larger payloads, more likely to hit limits)

**Failure handling:**
- Independent mutation processing within a batch — one failure doesn't abort others
- Failed mutations return to queue with incremented retry count (existing pattern)
- If entire batch fails (network down), pause sync and retry batch after backoff

**Progress feedback:**
- Existing Sentry metrics per sync run (Phase 2) are sufficient
- No new UI progress indicators needed — sync runs in background
- Log batch start/complete at debug level for troubleshooting

**Backoff behavior:**
- On 429: pause entire sync, backoff, then resume from where we left off
- Exponential backoff: start 1s, double each retry, cap at 60s
- Add jitter (±25%) to prevent thundering herd
- Max retries per sync run: 5 (then surface error to user)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to make appropriate technical decisions within the roadmap constraints.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-batch-sync*
*Context gathered: 2026-01-23*
