/// <reference lib="webworker" />

/**
 * Photo Processing Web Worker
 *
 * Receives ArrayBuffer messages, processes photos using OffscreenCanvas
 * via the shared core module, and transfers results back with zero-copy.
 */

import { processPhotoInContext } from './process-photo-core';

declare const self: DedicatedWorkerGlobalScope;

interface WorkerRequest {
  id: string;
  buffer: ArrayBuffer;
  options: {
    maxSize?: number;
    quality?: number;
    timestamp: string; // ISO string (Date not transferable)
    gpsCoordinates?: { lat: number; lng: number } | null;
  };
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: {
    buffer: ArrayBuffer; // Transferred back, not copied
    width: number;
    height: number;
    timestamp: string;
    gpsLat: number | null;
    gpsLng: number | null;
  };
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, options } = event.data;

  try {
    const result = await processPhotoInContext({
      buffer,
      maxSize: options.maxSize,
      quality: options.quality,
      timestamp: new Date(options.timestamp),
      gpsCoordinates: options.gpsCoordinates,
      useOffscreen: true,
    });

    // Convert result blob to ArrayBuffer for zero-copy transfer
    const resultBuffer = await result.blob.arrayBuffer();

    const response: WorkerResponse = {
      id,
      success: true,
      result: {
        buffer: resultBuffer,
        width: result.width,
        height: result.height,
        timestamp: result.timestamp,
        gpsLat: result.gpsLat,
        gpsLng: result.gpsLng,
      },
    };

    // Transfer the buffer (zero-copy) — buffer becomes unusable on this side
    self.postMessage(response, [resultBuffer]);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown worker error',
    };

    self.postMessage(response);
  }
};
