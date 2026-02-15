/**
 * Photo Processor Orchestrator
 *
 * Routes photo processing to Web Worker (off-thread via OffscreenCanvas)
 * or main thread based on browser capability detection.
 *
 * Strategy detection runs once and locks for the session.
 * Worker crashes trigger seamless main-thread retry (silent fallback).
 *
 * Usage:
 *   import { processPhotoOffThread } from '@/lib/photos/photo-processor';
 *   const result = await processPhotoOffThread({ file });
 */

import {
  processPhotoInContext,
  type ProcessedPhoto,
  type PhotoProcessingOptions,
} from './process-photo-core';

export type { ProcessedPhoto, PhotoProcessingOptions };

// ---------------------------------------------------------------------------
// OffscreenCanvas detection (run once, lock for session)
// ---------------------------------------------------------------------------

let _supportsOffscreen: boolean | null = null;

function supportsOffscreenCanvas(): boolean {
  if (_supportsOffscreen !== null) return _supportsOffscreen;
  try {
    _supportsOffscreen = typeof OffscreenCanvas !== 'undefined'
      && typeof Worker !== 'undefined'
      && typeof createImageBitmap !== 'undefined';
  } catch {
    _supportsOffscreen = false;
  }
  return _supportsOffscreen;
}

// ---------------------------------------------------------------------------
// Worker lifecycle (lazy singleton, no termination per design decision)
// ---------------------------------------------------------------------------

let _worker: Worker | null = null;
let _workerFailed = false; // If worker crashed, don't try again this session

function getWorker(): Worker | null {
  if (_workerFailed) return null;
  if (_worker) return _worker;

  if (!supportsOffscreenCanvas()) return null;

  try {
    _worker = new Worker(new URL('./photo-worker.ts', import.meta.url));
    _worker.onerror = () => {
      console.error('Photo worker crashed — falling back to main thread');
      _workerFailed = true;
      _worker = null;
    };
    return _worker;
  } catch (e) {
    console.warn('Failed to create photo worker:', e);
    _workerFailed = false; // Could be a transient error, allow retry
    return null;
  }
}

// ---------------------------------------------------------------------------
// Worker communication helper
// ---------------------------------------------------------------------------

let _requestCounter = 0;

function processViaWorker(
  worker: Worker,
  buffer: ArrayBuffer,
  options: PhotoProcessingOptions
): Promise<ProcessedPhoto> {
  return new Promise((resolve, reject) => {
    const id = String(++_requestCounter);
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', handleMessage);
      reject(new Error('Worker timeout (30s)'));
    }, 30000);

    function handleMessage(event: MessageEvent) {
      const response = event.data;
      if (response.id !== id) return; // Not our response

      clearTimeout(timeout);
      worker.removeEventListener('message', handleMessage);

      if (response.success && response.result) {
        resolve({
          blob: new Blob([response.result.buffer], { type: 'image/jpeg' }),
          width: response.result.width,
          height: response.result.height,
          timestamp: response.result.timestamp,
          gpsLat: response.result.gpsLat,
          gpsLng: response.result.gpsLng,
        });
      } else {
        reject(new Error(response.error || 'Worker processing failed'));
      }
    }

    worker.addEventListener('message', handleMessage);

    // Transfer buffer (zero-copy) — buffer becomes unusable on this side
    worker.postMessage({
      id,
      buffer,
      options: {
        maxSize: options.maxSize,
        quality: options.quality,
        timestamp: (options.timestamp ?? new Date()).toISOString(),
        gpsCoordinates: options.gpsCoordinates,
      },
    }, [buffer]);
  });
}

// ---------------------------------------------------------------------------
// Main-thread fallback
// ---------------------------------------------------------------------------

async function processOnMainThread(
  buffer: ArrayBuffer,
  options: PhotoProcessingOptions
): Promise<ProcessedPhoto> {
  return processPhotoInContext({
    buffer,
    maxSize: options.maxSize,
    quality: options.quality,
    timestamp: options.timestamp,
    gpsCoordinates: options.gpsCoordinates,
    useOffscreen: false,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PhotoProcessRequest {
  file: File;
  options?: PhotoProcessingOptions;
}

/**
 * Process a photo off the main thread when possible.
 *
 * Automatically detects OffscreenCanvas support and routes to Web Worker
 * or falls back to main thread. Worker crashes trigger seamless retry.
 */
export async function processPhotoOffThread(
  request: PhotoProcessRequest
): Promise<ProcessedPhoto> {
  const { file, options = {} } = request;
  const buffer = await file.arrayBuffer();

  const worker = getWorker();

  if (worker) {
    try {
      return await processViaWorker(worker, buffer, options);
    } catch (error) {
      // Worker crash: auto-retry on main thread seamlessly
      console.warn('Worker processing failed, retrying on main thread:', error);
      return processOnMainThread(buffer, options);
    }
  }

  // Silent fallback — user not informed
  return processOnMainThread(buffer, options);
}

/**
 * Check the current processing strategy.
 * Useful for logging/diagnostics — not shown to users.
 */
export function getProcessingStrategy(): 'worker' | 'main-thread' {
  return supportsOffscreenCanvas() && !_workerFailed ? 'worker' : 'main-thread';
}
