---
created: 2026-01-22T11:30
title: Review app for optimization and efficiency
area: quality
files:
  - .planning/codebase/CONCERNS.md
  - lib/offline/sync-processor.ts
  - lib/offline/mutation-queue.ts
  - components/admin/media/media-gallery.tsx
  - components/admin/tasks/task-modal.tsx
---

## Problem

The app was built before adopting GSD workflow. Now that the codebase has been mapped, want to do a comprehensive review to identify:

- Performance bottlenecks (identified some in CONCERNS.md: FIFO mutation sync, photo watermarking on main thread, full table sync on every app start)
- Code efficiency improvements (large component files 500+ lines, type casting to `any` in offline layer)
- Better architectural approaches (conflict resolution UI/logic separation, mutation queue state machine)
- Missing features that would improve reliability (no offline-first documentation, no monitoring/observability for sync, no automated testing)

This is a quality pass to bring the codebase up to best practices before adding new features.

## Solution

TBD - Review approach options:

1. **Prioritized fixes** — Work through CONCERNS.md items by severity
2. **Performance focus** — Profile and optimize the sync/photo processing first
3. **Architecture review** — Refactor large components and improve abstractions
4. **Testing foundation** — Add unit tests before making changes
