# Technology Stack: Offline-First PWA Quality Improvements

**Project:** ProStreet (Task Management PWA)
**Research Date:** 2026-01-22
**Research Mode:** Stack dimension for quality milestone

---

## Executive Summary

This research identifies the standard 2025/2026 tooling stack for testing, monitoring, and optimizing offline-first PWAs. ProStreet already uses Dexie.js for IndexedDB with a custom mutation queue pattern. The recommended stack focuses on:

1. **Testing:** Vitest + fake-indexeddb for unit tests, Playwright for E2E offline scenarios
2. **Monitoring:** Sentry with offline transport for error tracking
3. **Performance:** web-vitals library + Chrome DevTools integration
4. **Image Processing:** Comlink + Pica for Web Worker offloading

---

## Recommended Stack

### Testing Framework

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Vitest** | ^4.0.18 | Unit/integration test runner | HIGH |
| **@testing-library/react** | ^16.3.2 | React component testing | HIGH |
| **fake-indexeddb** | ^6.2.5 | IndexedDB polyfill for Node.js tests | HIGH |
| **@playwright/test** | ^1.57.0 | E2E testing with offline simulation | HIGH |
| **msw** | ^2.12.7 | API mocking for sync queue tests | HIGH |
| **vitest-mock-extended** | ^3.1.0 | Deep mocking for Supabase client | MEDIUM |

**Why Vitest over Jest:**
- Native Vite integration (Next.js 16 uses compatible tooling)
- 2-10x faster than Jest due to native ESM and smart parallelization
- Jest-compatible API - minimal migration effort
- Built-in TypeScript support without additional configuration
- Official Next.js documentation recommends Vitest for new projects

**Why fake-indexeddb:**
- Pure JS in-memory IndexedDB implementation
- Officially recommended by Dexie.js documentation
- Works directly with Dexie's constructor injection pattern
- Version 6.x supports modern structuredClone (Node 18+)

Sources:
- [Next.js Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB)
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)

---

### IndexedDB/Dexie Testing Setup

| Component | Approach | Notes |
|-----------|----------|-------|
| Unit tests | Inject fake-indexeddb into Dexie constructor | Per-test isolation |
| liveQuery tests | Use `fake-indexeddb/auto` global import | Required for reactivity |
| Integration tests | Real browser via Playwright | Full Dexie behavior |

**Configuration Pattern:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});

// vitest.setup.ts
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Reset IndexedDB between tests
beforeEach(() => {
  indexedDB = new IDBFactory();
});

afterEach(() => {
  cleanup();
});
```

**Testing Dexie with Injection (recommended for isolation):**

```typescript
import Dexie from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Create isolated DB instance per test
function createTestDB() {
  return new Dexie('test_db', { indexedDB, IDBKeyRange });
}
```

**Confidence:** HIGH - Verified via Dexie.js official documentation and npm package analysis.

Sources:
- [Dexie.js with fake-indexeddb](https://dexie.org/docs/Tutorial/Best-Practices)
- [fake-indexeddb npm](https://www.npmjs.com/package/fake-indexeddb)

---

### Offline Sync Testing

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Playwright** | ^1.57.0 | Network condition simulation | HIGH |
| **msw** | ^2.12.7 | Mock service worker for API responses | HIGH |

**Why Playwright for Offline Testing:**
- Built-in network condition control (`context.setOffline(true)`)
- Experimental service worker network events support
- Cross-browser testing (Chromium, Firefox, WebKit)
- Official Chrome team recommendation for PWA testing

**Why MSW:**
- Intercepts at network level (not application level)
- Reusable handlers across Vitest unit tests and Playwright E2E
- Framework-agnostic - works with fetch, axios, Supabase client
- Can simulate API failures, delays, and partial responses

**Offline Test Pattern:**

```typescript
// Playwright E2E test
import { test, expect } from '@playwright/test';

test('mutation queue persists offline changes', async ({ page, context }) => {
  // Load app while online
  await page.goto('/tasks');

  // Go offline
  await context.setOffline(true);

  // Perform action that should queue
  await page.click('[data-testid="complete-task"]');

  // Verify optimistic UI update
  await expect(page.locator('[data-testid="task-status"]')).toHaveText('Complete');

  // Verify pending mutation indicator
  await expect(page.locator('[data-testid="pending-sync"]')).toBeVisible();

  // Go back online
  await context.setOffline(false);

  // Verify sync completes
  await expect(page.locator('[data-testid="pending-sync"]')).not.toBeVisible();
});
```

**Confidence:** HIGH - Verified via Playwright official documentation.

Sources:
- [Playwright Service Workers](https://playwright.dev/docs/service-workers)
- [MSW Introduction](https://mswjs.io/docs/)
- [Testing Offline with Playwright](https://www.thegreenreport.blog/articles/offline-but-not-broken-testing-cached-data-with-playwright/offline-but-not-broken-testing-cached-data-with-playwright.html)

---

### Testing Next.js Server Actions

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Vitest** | ^4.0.18 | Server action unit tests | HIGH |
| **vitest-mock-extended** | ^3.1.0 | Deep mocking for Supabase | MEDIUM |
| **Playwright** | ^1.57.0 | E2E testing of async server components | HIGH |

**Important Limitation:** Vitest does not support async Server Components in unit tests. Use E2E tests for async components and server actions that depend on them.

**Server Action Testing Pattern:**

```typescript
import { describe, expect, test, vi } from 'vitest';
import { createSupabaseMock } from './test-utils';

// Mock Supabase before importing server action
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createSupabaseMock(),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }),
  revalidatePath: vi.fn(),
}));

import { updateTaskStatus } from '@/lib/tasks/actions';

describe('updateTaskStatus', () => {
  test('updates status and returns success', async () => {
    const result = await updateTaskStatus('task-1', 'status-2');
    expect(result.success).toBe(true);
  });

  test('redirects on auth failure', async () => {
    // Configure mock to return null user
    await expect(updateTaskStatus('task-1', 'status-2'))
      .rejects.toThrow('REDIRECT:/login');
  });
});
```

**Confidence:** HIGH for Vitest setup, MEDIUM for deep mocking patterns (may need adjustment based on Supabase client structure).

Sources:
- [Next.js Server Action Testing Discussion](https://github.com/vercel/next.js/discussions/69036)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking)

---

### Error Tracking and Monitoring

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@sentry/nextjs** | ^10.36.0 | Error tracking with offline support | HIGH |

**Why Sentry:**
- Official Next.js SDK with App Router support
- **Built-in offline transport** via `makeBrowserOfflineTransport`
- Uses IndexedDB to queue errors when offline
- Automatic flush when connectivity restored
- Source map integration via wizard
- 73,723 of top 1M websites use Sentry (market leader)

**Why NOT alternatives:**
- **LogRocket:** Better session replay, but Sentry has superior error aggregation and costs less for error-only use
- **GlitchTip:** Open source Sentry alternative, but lacks offline transport feature
- **Telebugs:** Self-hosted, but smaller ecosystem and less Next.js integration

**Offline Transport Configuration:**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';
import { makeBrowserOfflineTransport, makeFetchTransport } from '@sentry/browser';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Enable offline queueing
  transport: makeBrowserOfflineTransport(makeFetchTransport),
  transportOptions: {
    dbName: 'sentry-offline',
    storeName: 'queue',
    maxQueueSize: 30,
    flushAtStartup: true,
  },

  // Recommended for PWAs
  beforeSend(event) {
    // Add offline status context
    event.tags = {
      ...event.tags,
      online: navigator.onLine,
    };
    return event;
  },
});
```

**Confidence:** HIGH - Verified via official Sentry documentation.

Sources:
- [Sentry Offline Caching](https://docs.sentry.io/platforms/javascript/best-practices/offline-caching/)
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Alternatives Comparison](https://uptrace.dev/comparisons/sentry-alternatives)

---

### Performance Profiling

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **web-vitals** | ^5.1.0 | Core Web Vitals measurement | HIGH |
| **@next/bundle-analyzer** | ^16.1.4 | Bundle size analysis | HIGH |
| Chrome DevTools | Built-in | Real-time CWV monitoring | HIGH |

**Why web-vitals:**
- Official Google library for Core Web Vitals
- ~2KB brotli compressed
- Matches exactly how Chrome reports to CrUX
- Reports LCP, CLS, INP (replaced FID in March 2024)

**Integration Pattern:**

```typescript
// lib/analytics/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

type VitalsMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
};

export function reportWebVitals(onReport: (metric: VitalsMetric) => void) {
  onCLS(onReport);
  onINP(onReport);
  onLCP(onReport);
  onFCP(onReport);
  onTTFB(onReport);
}

// Send to analytics or Sentry
reportWebVitals((metric) => {
  // Option 1: Send to analytics endpoint
  navigator.sendBeacon('/api/vitals', JSON.stringify(metric));

  // Option 2: Add as Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${metric.name}: ${metric.value}`,
    level: metric.rating === 'poor' ? 'warning' : 'info',
  });
});
```

**Bundle Analyzer Setup:**

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // existing config
});
```

Run with: `ANALYZE=true npm run build`

**2025 Updates:**
- Chrome DevTools now has integrated Web Vitals (extension merged in January 2025)
- Safari 26.2 added LCP and INP support (cross-browser parity achieved)
- Firefox 144 added INP support (October 2025)

**Confidence:** HIGH - Verified via Google Chrome official documentation.

Sources:
- [web-vitals GitHub](https://github.com/GoogleChrome/web-vitals)
- [Chrome DevTools Web Vitals](https://developer.chrome.com/blog/web-vitals-extension)
- [2025 Web Performance Updates](https://www.debugbear.com/blog/2025-in-web-performance)

---

### Web Workers for Image Processing

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **comlink** | ^4.4.2 | Simplified Web Worker RPC | HIGH |
| **pica** | ^9.0.1 | High-quality image resizing | HIGH |

**Why Comlink:**
- 1.1KB library from Google Chrome Labs
- Turns postMessage into intuitive async function calls
- Handles Transferable objects automatically
- Works with Next.js (browser-only instantiation required)

**Why Pica:**
- Optimized for browser image resizing
- Automatically selects best method (WebAssembly, Web Workers, createImageBitmap)
- Avoids pixelation with Lanczos filter
- 9.0.x is latest stable

**Implementation Pattern:**

```typescript
// workers/image-processor.ts
import Pica from 'pica';
import { expose } from 'comlink';

const pica = new Pica();

const imageProcessor = {
  async resize(
    imageBitmap: ImageBitmap,
    maxWidth: number,
    maxHeight: number
  ): Promise<Blob> {
    // Create offscreen canvas
    const canvas = new OffscreenCanvas(maxWidth, maxHeight);

    // Calculate dimensions maintaining aspect ratio
    const ratio = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height);
    canvas.width = imageBitmap.width * ratio;
    canvas.height = imageBitmap.height * ratio;

    // Resize with pica
    await pica.resize(imageBitmap, canvas);

    // Convert to blob
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  },

  async compress(imageBitmap: ImageBitmap, quality: number): Promise<Blob> {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(imageBitmap, 0, 0);
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  },
};

expose(imageProcessor);

// lib/image-worker.ts (main thread)
import { wrap } from 'comlink';

let worker: Worker | null = null;

export function getImageWorker() {
  if (typeof window === 'undefined') return null;

  if (!worker) {
    worker = new Worker(new URL('../workers/image-processor.ts', import.meta.url));
  }

  return wrap<typeof import('../workers/image-processor').default>(worker);
}

// Usage in component
const imageWorker = getImageWorker();
if (imageWorker) {
  const bitmap = await createImageBitmap(file);
  const resizedBlob = await imageWorker.resize(bitmap, 1920, 1080);
}
```

**Confidence:** HIGH - Verified via Comlink official documentation and recent Next.js integration guides.

Sources:
- [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink)
- [Web Workers in Next.js 15 with Comlink](https://park.is/blog_posts/20250417_nextjs_comlink_examples/)
- [Pica npm](https://www.npmjs.com/package/pica)

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Jest** | Slower than Vitest, more configuration needed for ESM/TypeScript |
| **Cypress** | Heavier than Playwright, worse offline testing support |
| **LogRocket** (primary) | Overkill for error tracking; use Sentry. Consider LogRocket only if session replay needed |
| **Custom offline error queue** | Sentry has built-in IndexedDB transport - don't reinvent |
| **Manual postMessage** | Comlink eliminates boilerplate, same performance |
| **Sharp in browser** | Server-only; use Pica for client-side processing |
| **axios-offline** | Abandoned; use MSW for mocking, native fetch for production |

---

## Installation Commands

### Testing Stack

```bash
# Core testing
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths

# React Testing Library
npm install -D @testing-library/react @testing-library/dom jsdom

# IndexedDB testing
npm install -D fake-indexeddb

# E2E testing
npm install -D @playwright/test
npx playwright install

# API mocking
npm install -D msw

# Deep mocking for Supabase
npm install -D vitest-mock-extended
```

### Monitoring Stack

```bash
# Sentry with Next.js
npx @sentry/wizard@latest -i nextjs

# Or manual install
npm install @sentry/nextjs
```

### Performance Stack

```bash
# Web Vitals
npm install web-vitals

# Bundle analyzer
npm install -D @next/bundle-analyzer
```

### Web Worker Stack

```bash
# Comlink for worker communication
npm install comlink

# Pica for image processing
npm install pica
npm install -D @types/pica
```

---

## Configuration Files to Create

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest configuration with Next.js support |
| `vitest.setup.ts` | Global test setup (fake-indexeddb, cleanup) |
| `playwright.config.ts` | Playwright E2E configuration |
| `sentry.client.config.ts` | Sentry browser configuration with offline transport |
| `sentry.server.config.ts` | Sentry Node.js configuration |
| `sentry.edge.config.ts` | Sentry Edge runtime configuration |
| `next.config.js` | Add bundle analyzer wrapper |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Testing (Vitest) | HIGH | Official Next.js docs, npm version verified |
| Testing (fake-indexeddb) | HIGH | Dexie.js official recommendation |
| Testing (Playwright) | HIGH | Official docs, PWA testing features verified |
| Testing (MSW) | HIGH | Industry standard, version verified |
| Monitoring (Sentry) | HIGH | Official docs verified offline transport feature |
| Performance (web-vitals) | HIGH | Google official library |
| Web Workers (Comlink) | HIGH | Google Chrome Labs, recent Next.js guides |
| Web Workers (Pica) | HIGH | Established library, version verified |

---

## Roadmap Implications

Based on this research, the quality improvement milestone should be structured:

1. **Phase 1: Testing Foundation**
   - Set up Vitest with fake-indexeddb
   - Write unit tests for mutation queue functions
   - No blockers - standard patterns apply

2. **Phase 2: E2E Offline Testing**
   - Configure Playwright with network simulation
   - Write offline sync scenario tests
   - May need phase-specific research for Background Sync API testing

3. **Phase 3: Monitoring Integration**
   - Integrate Sentry with offline transport
   - Configure source maps for production builds
   - Standard implementation - no research needed

4. **Phase 4: Performance Optimization**
   - Integrate web-vitals reporting
   - Run bundle analysis
   - Implement Web Worker image processing
   - May need research on specific bottlenecks found

---

## Sources Summary

### Official Documentation (HIGH confidence)
- [Next.js Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Playwright Service Workers](https://playwright.dev/docs/service-workers)
- [Sentry Offline Caching](https://docs.sentry.io/platforms/javascript/best-practices/offline-caching/)
- [web-vitals GitHub](https://github.com/GoogleChrome/web-vitals)
- [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink)
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB)
- [MSW Documentation](https://mswjs.io/docs/)

### npm Registry (Version verification)
- vitest: 4.0.18
- @playwright/test: 1.57.0
- fake-indexeddb: 6.2.5
- @sentry/nextjs: 10.36.0
- web-vitals: 5.1.0
- comlink: 4.4.2
- pica: 9.0.1
- msw: 2.12.7
- @next/bundle-analyzer: 16.1.4
- @testing-library/react: 16.3.2

### Community/Analysis Sources (MEDIUM confidence)
- [Sentry Alternatives Comparison](https://uptrace.dev/comparisons/sentry-alternatives)
- [2025 Web Performance Updates](https://www.debugbear.com/blog/2025-in-web-performance)
- [Web Workers in Next.js with Comlink](https://park.is/blog_posts/20250417_nextjs_comlink_examples/)
