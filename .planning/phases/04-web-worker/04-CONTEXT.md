# Phase 4: Web Worker - Context

**Gathered:** 2026-02-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Move photo compression and watermarking to a Web Worker so the UI stays responsive during photo uploads. Browsers without OffscreenCanvas fall back to main thread processing. Photo upload flow itself is not changing — only where the processing runs.

</domain>

<decisions>
## Implementation Decisions

### Progress feedback
- Simple status text (not progress bars or percentages)
- Toast notification for processing status, not inline with the photo list
- User stays on the current screen during processing (no background navigation)
- Success toast ("Photos ready") auto-dismisses when all photos finish

### Multi-photo handling
- Process one photo at a time sequentially (not parallel)
- Toast shows counter: "Processing photo 2 of 5..."
- Disable "add photo" button while processing is in progress
- If one photo fails, continue processing the rest — report failures at end

### Fallback experience
- Silent fallback — user is not informed when main thread is used instead of worker
- Detect OffscreenCanvas support once on app load, lock strategy for the session
- Field crews mostly use modern phones — fallback is a safety net, not primary path

### Processing failures
- Compression failure → upload the original uncompressed photo (data preservation)
- Watermark failure (compression succeeded) → upload compressed photo without watermark
- Failures handled silently — user doesn't see internal processing errors
- Worker crash → auto-retry the same photo on main thread seamlessly

### Claude's Discretion
- Quality reduction strategy on main-thread fallback (whether to reduce compression effort for UI responsiveness)
- Toast component choice and styling
- Worker initialization and termination lifecycle
- Error logging strategy for silent failures

</decisions>

<specifics>
## Specific Ideas

- Priority is data preservation — field photos should never be lost due to processing errors
- "Processing photo X of Y..." counter pattern for the toast
- The whole flow should feel invisible to field workers — they take photos and they upload, processing is an implementation detail

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-web-worker*
*Context gathered: 2026-02-14*
