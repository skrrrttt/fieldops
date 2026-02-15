# Phase 4: Web Worker - Research

**Researched:** 2026-02-14
**Domain:** Web Workers, OffscreenCanvas, client-side image processing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Progress feedback
- Simple status text (not progress bars or percentages)
- Toast notification for processing status, not inline with the photo list
- User stays on the current screen during processing (no background navigation)
- Success toast ("Photos ready") auto-dismisses when all photos finish

#### Multi-photo handling
- Process one photo at a time sequentially (not parallel)
- Toast shows counter: "Processing photo 2 of 5..."
- Disable "add photo" button while processing is in progress
- If one photo fails, continue processing the rest -- report failures at end

#### Fallback experience
- Silent fallback -- user is not informed when main thread is used instead of worker
- Detect OffscreenCanvas support once on app load, lock strategy for the session
- Field crews mostly use modern phones -- fallback is a safety net, not primary path

#### Processing failures
- Compression failure -> upload the original uncompressed photo (data preservation)
- Watermark failure (compression succeeded) -> upload compressed photo without watermark
- Failures handled silently -- user doesn't see internal processing errors
- Worker crash -> auto-retry the same photo on main thread seamlessly

### Claude's Discretion
- Quality reduction strategy on main-thread fallback (whether to reduce compression effort for UI responsiveness)
- Toast component choice and styling
- Worker initialization and termination lifecycle
- Error logging strategy for silent failures

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase moves photo compression and watermarking from the main thread to a Web Worker using OffscreenCanvas. The current `processPhoto` function in `lib/photos/process-photo.ts` uses `new Image()` and `document.createElement('canvas')` -- neither available in a Web Worker. The worker version must use `createImageBitmap()` (to decode images from Blobs) and `OffscreenCanvas` (to draw and compress). The good news: `OffscreenCanvasRenderingContext2D` supports every method the current watermark code uses except `drawFocusIfNeeded()`, which is irrelevant.

OffscreenCanvas has 95% global browser support (Chrome 69+, Firefox 105+, Safari 17+, Edge 79+). The fallback path for older browsers uses the existing main-thread code unchanged. The key architectural decision is to create a processing service layer that abstracts the worker vs main-thread choice, so callers (`photo-upload.tsx`, `app/upload/page.tsx`) don't need to know which strategy is active.

**Primary recommendation:** Build a custom Web Worker (not a third-party library like `browser-image-compression`) since the existing processing logic includes custom watermarking that no library supports. Use the `new Worker(new URL('./worker.ts', import.meta.url))` webpack 5 syntax already supported by Next.js. Test with `@vitest/web-worker`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Worker API | Browser built-in | Off-main-thread processing | Native browser API, zero dependencies |
| OffscreenCanvas API | Browser built-in | Canvas rendering in workers | Only way to do canvas ops in workers |
| createImageBitmap() | Browser built-in | Decode images from Blobs in workers | Replaces `new Image()` which is unavailable in workers |
| webpack 5 (via Next.js) | Built into Next.js 16 | Worker bundling | `new URL('./worker.ts', import.meta.url)` syntax is natively supported |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Processing status feedback (recommended by shadcn/ui as toast standard) |
| @vitest/web-worker | Match vitest 4.x | Test Web Workers in Vitest | Required for unit testing worker message handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom worker | browser-image-compression | Handles resize+compress+worker but does NOT support custom watermarking. Would need to watermark separately, defeating the purpose |
| sonner | Existing SyncToast component | SyncToast exists at `components/offline/sync-toast.tsx` and works, but is a single-message component. Sonner is the shadcn/ui standard, supports stacking and auto-dismiss natively, and is better suited for the "Processing photo X of Y" counter pattern |
| Custom worker | Comlink | Adds RPC-style API over postMessage. Overkill for single request-response pattern |

**Installation:**
```bash
npx shadcn@latest add sonner
npm install -D @vitest/web-worker
```

No runtime dependencies needed -- Web Worker and OffscreenCanvas are browser built-ins.

## Architecture Patterns

### Recommended Project Structure
```
lib/photos/
  process-photo.ts          # EXISTING: main-thread processing (keeps working as fallback)
  photo-worker.ts           # NEW: Web Worker entry point
  photo-processor.ts        # NEW: orchestrator - routes to worker or main thread
  process-photo-core.ts     # NEW: shared processing logic (works in both contexts)
```

### Pattern 1: Processing Service with Strategy Pattern
**What:** A `PhotoProcessor` service that detects OffscreenCanvas support once on load and routes all subsequent calls to either the worker or main thread.
**When to use:** When the same processing needs to happen in two different contexts (worker vs main thread).

```typescript
// lib/photos/photo-processor.ts
// Detect once, lock for session
const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
let worker: Worker | null = null;

function getWorker(): Worker | null {
  if (!supportsOffscreenCanvas) return null;
  if (!worker) {
    worker = new Worker(
      new URL('./photo-worker.ts', import.meta.url)
    );
  }
  return worker;
}

export async function processPhotoOffThread(
  file: File,
  options: PhotoProcessingOptions
): Promise<ProcessedPhoto> {
  const w = getWorker();
  if (!w) {
    // Fallback: use main thread
    return processPhoto(file, options);
  }
  // ... send to worker, await response
}
```

### Pattern 2: Worker Message Protocol
**What:** Typed request/response messages between main thread and worker.
**When to use:** Any main-thread-to-worker communication.

```typescript
// Message types shared between main thread and worker
interface ProcessPhotoRequest {
  type: 'PROCESS_PHOTO';
  id: string;            // Correlation ID for matching responses
  imageData: ArrayBuffer; // Transferred, not copied
  options: {
    maxSize: number;
    quality: number;
    timestamp: string;    // Serialized (Date is not transferable)
    gpsCoordinates: { lat: number; lng: number } | null;
  };
}

interface ProcessPhotoResponse {
  type: 'PROCESS_PHOTO_RESULT';
  id: string;
  success: boolean;
  blob?: Blob;           // Compressed JPEG
  width?: number;
  height?: number;
  error?: string;
  phase?: 'compression' | 'watermark'; // Which step failed
}
```

### Pattern 3: createImageBitmap Replaces new Image()
**What:** In workers, you cannot use `new Image()`. Use `createImageBitmap(blob)` instead.
**When to use:** Any image loading inside a Web Worker.

```typescript
// WORKER: process-photo-core.ts (shared between main and worker)
// In worker context: decode image from blob
const bitmap = await createImageBitmap(blob);

// Create OffscreenCanvas at target dimensions
const canvas = new OffscreenCanvas(targetWidth, targetHeight);
const ctx = canvas.getContext('2d')!;

// Draw resized image
ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
bitmap.close(); // Free memory

// Add watermark (same ctx API as CanvasRenderingContext2D)
addWatermark(ctx, targetWidth, targetHeight, timestamp, gpsCoordinates);

// Export as JPEG blob
const resultBlob = await canvas.convertToBlob({
  type: 'image/jpeg',
  quality: 0.8,
});
```

### Pattern 4: Transferable Objects for Zero-Copy
**What:** Use the `transfer` parameter of `postMessage()` to move ArrayBuffers without copying.
**When to use:** Sending image data to/from workers.

```typescript
// Main thread: send file data to worker
const arrayBuffer = await file.arrayBuffer();
worker.postMessage(
  { type: 'PROCESS_PHOTO', id, imageData: arrayBuffer, options },
  [arrayBuffer]  // Transfer list -- zero-copy
);

// Worker: send result back
const resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
const resultBuffer = await resultBlob.arrayBuffer();
self.postMessage(
  { type: 'PROCESS_PHOTO_RESULT', id, resultBuffer, success: true },
  [resultBuffer]  // Transfer list
);
```

### Pattern 5: Graceful Degradation Chain
**What:** Fallback chain: worker+compress+watermark -> worker+compress -> main-thread+compress+watermark -> original file.
**When to use:** Data preservation priority -- field photos must never be lost.

```typescript
// In the worker or main thread
async function processWithFallbacks(file, options): Promise<ProcessedPhoto> {
  try {
    // Step 1: Compress (resize)
    const compressed = await compressImage(imageData, options);

    try {
      // Step 2: Watermark
      const watermarked = await addWatermark(compressed, options);
      return watermarked;
    } catch (watermarkError) {
      console.warn('[PhotoProcessor] Watermark failed, using compressed only', watermarkError);
      return compressed; // Data preserved, just no watermark
    }
  } catch (compressionError) {
    console.warn('[PhotoProcessor] Compression failed, using original', compressionError);
    return { blob: file, width: 0, height: 0, ... }; // Original file preserved
  }
}
```

### Anti-Patterns to Avoid
- **Sending File objects to workers:** File objects cannot be transferred. Convert to ArrayBuffer first, then transfer.
- **Using `new Image()` in workers:** Does not exist in worker context. Use `createImageBitmap()`.
- **Using `document.createElement('canvas')` in workers:** No DOM in workers. Use `new OffscreenCanvas(width, height)`.
- **Copying large buffers instead of transferring:** Always use the transfer list parameter of `postMessage()` for ArrayBuffers. Without transfer, the data is cloned (expensive for multi-MB photos).
- **Creating a new Worker per photo:** Worker startup has overhead. Create once, reuse for the session.
- **Storing Worker reference in React state:** Worker should be a module-level singleton, not component state. Components mount/unmount but the worker should persist.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | sonner (via shadcn/ui) | Handles stacking, auto-dismiss, animation, accessibility. The existing SyncToast is too simple for the "X of Y" counter pattern |
| Web Worker test harness | Custom Worker mock | @vitest/web-worker | Simulates workers in the same thread for testing, handles message passing |
| Image decoding in workers | Custom blob-to-pixels decoder | createImageBitmap() | Browser-native, handles all image formats including HEIC, hardware-accelerated |
| Canvas-to-JPEG conversion in workers | Custom encoder | OffscreenCanvas.convertToBlob() | Browser-native JPEG encoder, vastly more efficient than any JS implementation |
| EXIF orientation reading | Custom EXIF parser rewrite | Keep existing getExifOrientation() | The current implementation works perfectly. Run it on main thread before sending data to worker, or use createImageBitmap's `imageOrientation: 'from-image'` option |

**Key insight:** The current `processPhoto` code does three things: (1) EXIF reading from File, (2) resize+draw on canvas, (3) watermark text drawing. Only (2) and (3) need to move to the worker. EXIF reading can stay on the main thread OR be eliminated entirely by using `createImageBitmap(blob, { imageOrientation: 'from-image' })` which auto-corrects EXIF orientation.

## Common Pitfalls

### Pitfall 1: Image Constructor Unavailable in Workers
**What goes wrong:** Code that uses `new Image()` or `document.createElement('canvas')` crashes immediately in the worker with `ReferenceError: Image is not defined`.
**Why it happens:** Workers have no DOM access. These are DOM APIs.
**How to avoid:** Use `createImageBitmap(blob)` for image loading and `new OffscreenCanvas(w, h)` for canvas creation. The existing `processPhoto` function must be refactored to use these APIs.
**Warning signs:** Any import of `document` or `Image` in worker code.

### Pitfall 2: EXIF Orientation with createImageBitmap
**What goes wrong:** Photos appear rotated because EXIF orientation is not applied.
**Why it happens:** The current code manually reads EXIF and applies rotation transforms. `createImageBitmap` can handle this automatically.
**How to avoid:** Use `createImageBitmap(blob, { imageOrientation: 'from-image' })` which tells the browser to auto-correct orientation. This eliminates the need for the manual EXIF parsing code entirely in the worker path. The option is widely supported (Chrome 52+, Firefox 93+, Safari 15+).
**Warning signs:** Test with an iOS portrait photo -- if it appears sideways, EXIF handling is broken.

### Pitfall 3: Worker File Not Bundled by Next.js
**What goes wrong:** Worker file is not found at runtime, or TypeScript types break.
**Why it happens:** Next.js uses webpack 5 which requires the specific `new URL('./worker.ts', import.meta.url)` syntax. Variables or dynamic paths break detection. Turbopack may also have edge cases with workers.
**How to avoid:** Use the exact syntax `new Worker(new URL('./photo-worker.ts', import.meta.url))`. Do not extract the URL to a variable. Verify the worker loads in both `next dev` and `next build`.
**Warning signs:** Worker constructor throws at runtime; check browser devtools network tab for 404 on worker script.

### Pitfall 4: Data Not Transferred (Copied Instead)
**What goes wrong:** Photo processing is slow because multi-MB ArrayBuffers are being copied, not transferred.
**Why it happens:** `postMessage(data)` without the second `transfer` argument clones data using the structured clone algorithm, which copies the entire buffer.
**How to avoid:** Always use `postMessage(data, [arrayBuffer])` with the transferable list. After transfer, the original buffer becomes zero-length (neutered) -- do not try to use it.
**Warning signs:** Memory spikes during photo processing visible in devtools Memory tab.

### Pitfall 5: TypeScript Types for Worker Context
**What goes wrong:** TypeScript errors when using `OffscreenCanvas`, `createImageBitmap`, or `self.onmessage` in worker files.
**Why it happens:** The main tsconfig uses `"lib": ["dom", "dom.iterable", "esnext"]` which includes DOM types but the worker file needs WebWorker types.
**How to avoid:** Add a triple-slash directive at the top of the worker file: `/// <reference lib="webworker" />`. Alternatively, use a separate tsconfig for the worker file. TypeScript 5.x includes OffscreenCanvas types in `lib.webworker.d.ts` (resolved in TypeScript PR #51300, July 2023).
**Warning signs:** TypeScript errors like `Cannot find name 'OffscreenCanvas'` in the worker file.

### Pitfall 6: Worker Crashes Silently
**What goes wrong:** Unhandled errors in the worker cause it to silently stop responding. The main thread waits forever.
**Why it happens:** Workers run in isolation. Uncaught exceptions terminate the worker without notifying the main thread unless you handle the `error` event.
**How to avoid:** Add `worker.onerror` handler on the main thread. Add try/catch wrapping all worker message handlers. Implement a timeout on the main thread -- if no response within N seconds, fall back to main-thread processing. Always add correlation IDs to messages so the main thread can match responses to requests.
**Warning signs:** Photo upload hangs indefinitely with no error message.

### Pitfall 7: Font Not Available in Worker
**What goes wrong:** Watermark text renders with wrong font in the worker.
**Why it happens:** Workers don't have access to the page's CSS font declarations. `ctx.font = 'bold 16px Arial, sans-serif'` will use whatever system fonts the browser provides in the worker context.
**How to avoid:** The current watermark uses `'bold ${fontSize}px Arial, sans-serif'` -- Arial is a system font available in all contexts, so this should work. If custom fonts were needed, they would need to be loaded via `FontFace` API in the worker, but that is not needed here.
**Warning signs:** Watermark text looks different (different font) on processed photos.

## Code Examples

### Example 1: Web Worker Entry Point (photo-worker.ts)
```typescript
/// <reference lib="webworker" />

// Message types
interface ProcessRequest {
  type: 'PROCESS_PHOTO';
  id: string;
  imageData: ArrayBuffer;
  options: {
    maxSize: number;
    quality: number;
    timestamp: string;
    gpsCoordinates: { lat: number; lng: number } | null;
  };
}

interface ProcessResponse {
  type: 'PHOTO_PROCESSED';
  id: string;
  success: boolean;
  resultData?: ArrayBuffer;
  width?: number;
  height?: number;
  error?: string;
  fallbackPhase?: 'compression' | 'watermark';
}

self.onmessage = async (event: MessageEvent<ProcessRequest>) => {
  const { id, imageData, options } = event.data;

  try {
    const blob = new Blob([imageData], { type: 'image/jpeg' });

    // Decode image with auto EXIF correction
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: 'from-image',
    });

    // Calculate target dimensions
    const { width, height } = calculateDimensions(
      bitmap.width, bitmap.height, options.maxSize
    );

    // Create OffscreenCanvas and draw resized image
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Add watermark (try/catch -- watermark failure is non-fatal)
    try {
      addWatermark(ctx, width, height,
        new Date(options.timestamp), options.gpsCoordinates);
    } catch (e) {
      console.warn('[PhotoWorker] Watermark failed:', e);
    }

    // Convert to JPEG
    const resultBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: options.quality,
    });
    const resultBuffer = await resultBlob.arrayBuffer();

    const response: ProcessResponse = {
      type: 'PHOTO_PROCESSED',
      id,
      success: true,
      resultData: resultBuffer,
      width,
      height,
    };
    self.postMessage(response, [resultBuffer]);

  } catch (error) {
    const response: ProcessResponse = {
      type: 'PHOTO_PROCESSED',
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

function calculateDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  if (w > h) {
    return { width: max, height: Math.round(h * (max / w)) };
  }
  return { width: Math.round(w * (max / h)), height: max };
}
```
Source: Derived from current `lib/photos/process-photo.ts` + MDN OffscreenCanvas docs

### Example 2: Next.js Worker Instantiation
```typescript
// lib/photos/photo-processor.ts
// Source: Next.js with-web-worker example (github.com/vercel/next.js)

let worker: Worker | null = null;
let supportsWorker: boolean | null = null;

function canUseWorker(): boolean {
  if (supportsWorker !== null) return supportsWorker;
  supportsWorker = typeof OffscreenCanvas !== 'undefined'
    && typeof Worker !== 'undefined';
  return supportsWorker;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./photo-worker.ts', import.meta.url)
    );
    worker.onerror = (e) => {
      console.error('[PhotoProcessor] Worker error:', e);
      // Terminate crashed worker so it gets recreated
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}
```

### Example 3: Sonner Toast Usage Pattern
```typescript
// Source: shadcn/ui sonner docs (ui.shadcn.com/docs/components/radix/sonner)
import { toast } from 'sonner';

// Counter pattern for sequential processing
function showProcessingToast(current: number, total: number) {
  toast.loading(`Processing photo ${current} of ${total}...`, {
    id: 'photo-processing',  // Same ID = updates existing toast
  });
}

function showSuccessToast() {
  toast.success('Photos ready', {
    id: 'photo-processing',
    duration: 3000,  // Auto-dismiss after 3s
  });
}

function showFailureToast(failCount: number) {
  toast.error(`${failCount} photo(s) could not be processed`, {
    id: 'photo-processing',
    duration: 5000,
  });
}
```

### Example 4: Testing with @vitest/web-worker
```typescript
// Source: @vitest/web-worker docs (github.com/vitest-dev/vitest)
import '@vitest/web-worker';
import { describe, it, expect } from 'vitest';

describe('PhotoWorker', () => {
  it('processes a photo and returns compressed blob', async () => {
    const worker = new Worker(
      new URL('../photo-worker.ts', import.meta.url)
    );

    const testImageData = new ArrayBuffer(100); // Minimal test data

    const result = await new Promise<any>((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({
        type: 'PROCESS_PHOTO',
        id: 'test-1',
        imageData: testImageData,
        options: { maxSize: 1920, quality: 0.8, timestamp: new Date().toISOString(), gpsCoordinates: null },
      }, [testImageData]);
    });

    expect(result.type).toBe('PHOTO_PROCESSED');
    // Note: In jsdom, createImageBitmap and OffscreenCanvas are not available.
    // Worker tests will need mocking of these APIs or use Playwright for integration tests.
    worker.terminate();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Image()` + `<canvas>` on main thread | `createImageBitmap()` + `OffscreenCanvas` in worker | OffscreenCanvas widely available since Safari 17 (Sep 2023) | Non-blocking image processing, 95% browser support |
| Manual EXIF orientation parsing | `createImageBitmap(blob, { imageOrientation: 'from-image' })` | Always available with createImageBitmap | Eliminates 60+ lines of manual EXIF code in worker path |
| worker-loader webpack plugin | `new Worker(new URL('./w.ts', import.meta.url))` | webpack 5 (Next.js 11+, 2021) | No extra dependencies, TypeScript supported natively |
| `@zeit/next-workers` plugin | Built-in webpack 5 worker support | Next.js 12 removed webpack 4 (2021) | Zero config needed |
| Custom toast component | sonner (shadcn/ui standard) | shadcn/ui deprecated legacy Toast in favor of Sonner (2024) | Better API for updating existing toasts (same ID pattern) |

**Deprecated/outdated:**
- `worker-loader`: Replaced by webpack 5 native worker syntax
- `@zeit/next-workers`: Abandoned, no longer needed
- `@types/offscreencanvas`: No longer needed; TypeScript 5.x includes types natively (PR #51300)

## Discretion Recommendations

### Quality Reduction on Main-Thread Fallback
**Recommendation: No reduction.** The main-thread fallback should use the same quality settings (1920px max, 0.8 quality). The processing is fast enough on modern devices (sub-second for typical phone photos). Reducing quality would create inconsistent photo output between browsers. The fallback is for <5% of users on older browsers -- keeping it simple and consistent is better than optimizing a rare path.

### Toast Component Choice
**Recommendation: sonner via shadcn/ui.** Reasons:
1. shadcn/ui's recommended toast solution (the legacy Toast component is being deprecated)
2. Supports updating an existing toast by ID -- perfect for "Processing photo X of Y" counter
3. `toast.loading()` shows a spinner, `toast.success()` auto-dismisses -- matches user requirements
4. The existing `SyncToast` component could work but would need significant modification for the counter pattern and doesn't support stacking multiple toast types
5. Installation is one command: `npx shadcn@latest add sonner`
6. Needs `<Toaster />` added to root layout

### Worker Initialization and Termination Lifecycle
**Recommendation: Lazy singleton, no termination.**
- Create the worker on first use (not on app load) -- saves resources for sessions that don't upload photos
- Keep it alive for the session -- worker startup has overhead, and users often upload multiple batches
- Only terminate on unrecoverable error (detected via `worker.onerror`), then recreate on next use
- Do not terminate after each batch -- the cost of keeping an idle worker alive is negligible

### Error Logging Strategy
**Recommendation: `console.warn` for expected fallbacks, `console.error` for unexpected failures.**
- Watermark failure on a compressed photo: `console.warn('[PhotoProcessor] Watermark failed, proceeding without')` -- expected degradation
- Worker crash: `console.error('[PhotoProcessor] Worker crashed, falling back to main thread')` -- unexpected but handled
- Compression failure (original uploaded): `console.warn('[PhotoProcessor] Compression failed, uploading original')` -- data preserved
- These logs help debugging without surfacing errors to users (matching the "silent failures" decision)
- If Sentry is integrated (it is -- `@sentry/nextjs` is in package.json), consider `Sentry.captureMessage()` for worker crashes to track reliability

## Open Questions

1. **Turbopack Worker Support**
   - What we know: Next.js 16 may use Turbopack by default. Turbopack has known issues with Web Workers (blob URLs instead of proper URLs, WASM loading failures). Webpack 5 worker syntax works reliably.
   - What's unclear: Whether the production build with Turbopack handles `new URL('./worker.ts', import.meta.url)` correctly in all cases.
   - Recommendation: Test with both `next dev` (Turbopack) and `next build` (webpack). If Turbopack fails, the worker file is a static asset and can be placed in `public/` as a plain JS fallback, though this loses TypeScript compilation. Alternatively, force webpack for the build if Turbopack causes issues.

2. **createImageBitmap `imageOrientation` Support in Older Browsers**
   - What we know: The option is supported in Chrome 52+, Firefox 93+, Safari 15+. The current codebase manually parses EXIF for older browser support.
   - What's unclear: Whether any target devices (field crew phones) lack this option.
   - Recommendation: Since OffscreenCanvas requires Safari 17+ and the worker path only runs when OffscreenCanvas is available, `imageOrientation: 'from-image'` will always be available in the worker path. The main-thread fallback keeps the manual EXIF code.

3. **jsdom Limitations for Worker Unit Tests**
   - What we know: jsdom does not implement `OffscreenCanvas`, `createImageBitmap`, or the real `Worker` API. `@vitest/web-worker` simulates message passing but doesn't polyfill canvas APIs.
   - What's unclear: How much of the processing logic can be meaningfully unit-tested vs. requiring Playwright integration tests.
   - Recommendation: Unit test the orchestration layer (message routing, fallback logic, timeout handling) with mocked canvas APIs. Test actual image processing with Playwright against the deployed app. The processing functions themselves (resize, watermark) are already validated by the existing main-thread code.

## Sources

### Primary (HIGH confidence)
- MDN: OffscreenCanvas API - https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- MDN: OffscreenCanvas.convertToBlob() - https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob
- MDN: OffscreenCanvasRenderingContext2D - https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D
- MDN: WorkerGlobalScope.createImageBitmap() - https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/createImageBitmap
- MDN: Transferable Objects - https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- Can I Use: OffscreenCanvas - 94.99% global support - https://caniuse.com/offscreencanvas
- TypeScript #51300: OffscreenCanvas types in lib.webworker.d.ts (merged July 2023) - https://github.com/microsoft/TypeScript/issues/47752
- Next.js with-web-worker example - https://github.com/vercel/next.js/tree/canary/examples/with-web-worker
- webpack 5 Web Workers guide - https://webpack.js.org/guides/web-workers/
- shadcn/ui Sonner docs - https://ui.shadcn.com/docs/components/radix/sonner
- @vitest/web-worker - https://github.com/vitest-dev/vitest/tree/a9d36c719f8ce5551f61da20181490d3673bdf99/packages/web-worker

### Secondary (MEDIUM confidence)
- web.dev: OffscreenCanvas article - https://web.dev/articles/offscreen-canvas
- dbushell.com: Offscreen Canvas and Web Workers (April 2024) - https://dbushell.com/2024/04/02/offscreen-canvas-and-web-workers/
- Chrome Blog: Transferable Objects - https://developer.chrome.com/blog/transferable-objects-lightning-fast
- browser-image-compression GitHub - https://github.com/Donaldcwl/browser-image-compression

### Tertiary (LOW confidence)
- Next.js Turbopack worker issues - https://github.com/vercel/next.js/issues/84782 (may be resolved in newer versions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All browser-native APIs, well-documented, 95% support
- Architecture: HIGH - Pattern is well-established (process in worker, fallback to main thread), verified against existing codebase
- Pitfalls: HIGH - DOM-unavailability in workers is well-documented, TypeScript type issues are resolved, transfer vs clone is well-understood
- Testing: MEDIUM - @vitest/web-worker handles message simulation but canvas API mocking in jsdom is a known limitation

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable APIs, unlikely to change)
