# Phase 1: Testing Foundation - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Vitest with fake-indexeddb for unit testing the offline sync layer. Write tests for mutation queue and sync processor. Eliminate `any` casts in Dexie operations. Fix the non-functional `clearSyncedMutations()` bug.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User confirmed the roadmap success criteria are sufficient guidance. Claude has full discretion on:

- Test file organization and naming
- Specific test scenarios beyond the required coverage (FIFO, CRUD, retry, conflicts, status transitions)
- Type-safe Dexie wrapper implementation approach
- clearSyncedMutations fix strategy (immediate vs batched deletion)
- Test isolation implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — follow standard testing patterns and the research recommendations (Vitest ^4.0, fake-indexeddb ^6.2.5 with new IDBFactory per test).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-testing-foundation*
*Context gathered: 2026-01-22*
