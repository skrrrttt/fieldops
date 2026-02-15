import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the core processing module
vi.mock('./process-photo-core', () => ({
  processPhotoInContext: vi.fn().mockResolvedValue({
    blob: new Blob(['test'], { type: 'image/jpeg' }),
    width: 800,
    height: 600,
    timestamp: '2026-01-01T00:00:00.000Z',
    gpsLat: null,
    gpsLng: null,
  }),
}));

function createTestFile(): File {
  const content = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic bytes
  const file = new File([content], 'test.jpg', { type: 'image/jpeg' });
  // jsdom File does not implement arrayBuffer(), polyfill it for tests
  if (!file.arrayBuffer) {
    file.arrayBuffer = () =>
      new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
  }
  return file;
}

describe('photo-processor orchestrator', () => {
  let processPhotoOffThread: typeof import('./photo-processor').processPhotoOffThread;
  let getProcessingStrategy: typeof import('./photo-processor').getProcessingStrategy;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import to reset module-level state (_supportsOffscreen, _worker, _workerFailed)
    const mod = await import('./photo-processor');
    processPhotoOffThread = mod.processPhotoOffThread;
    getProcessingStrategy = mod.getProcessingStrategy;
  });

  it('falls back to main thread when OffscreenCanvas is not available', async () => {
    // jsdom does not have OffscreenCanvas, so this tests the fallback path
    const { processPhotoInContext } = await import('./process-photo-core');

    const result = await processPhotoOffThread({ file: createTestFile() });

    expect(processPhotoInContext).toHaveBeenCalledWith(
      expect.objectContaining({
        useOffscreen: false,
      })
    );
    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('reports main-thread strategy when OffscreenCanvas unavailable', () => {
    // jsdom has no OffscreenCanvas
    expect(getProcessingStrategy()).toBe('main-thread');
  });

  it('returns ProcessedPhoto with correct shape', async () => {
    const result = await processPhotoOffThread({ file: createTestFile() });

    expect(result).toHaveProperty('blob');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result).toHaveProperty('width');
    expect(typeof result.width).toBe('number');
    expect(result).toHaveProperty('height');
    expect(typeof result.height).toBe('number');
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.timestamp).toBe('string');
    expect(result).toHaveProperty('gpsLat');
    expect(result).toHaveProperty('gpsLng');
  });

  it('passes options through to processing core', async () => {
    const { processPhotoInContext } = await import('./process-photo-core');
    const specificDate = new Date('2026-06-15T12:00:00Z');

    await processPhotoOffThread({
      file: createTestFile(),
      options: {
        maxSize: 1024,
        quality: 0.5,
        timestamp: specificDate,
        gpsCoordinates: { lat: 1, lng: 2 },
      },
    });

    expect(processPhotoInContext).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSize: 1024,
        quality: 0.5,
        timestamp: specificDate,
        gpsCoordinates: { lat: 1, lng: 2 },
        useOffscreen: false,
      })
    );
  });

  it('handles processing failure gracefully', async () => {
    const { processPhotoInContext } = await import('./process-photo-core');
    vi.mocked(processPhotoInContext).mockRejectedValueOnce(new Error('Processing failed'));

    await expect(
      processPhotoOffThread({ file: createTestFile() })
    ).rejects.toThrow('Processing failed');
  });

  describe('with worker support (requires @vitest/web-worker)', () => {
    // These tests verify worker path -- skip if Worker not available in test env
    it.todo('routes to worker when OffscreenCanvas is available');
    it.todo('retries on main thread when worker crashes');
    it.todo('times out after 30 seconds');
  });
});
