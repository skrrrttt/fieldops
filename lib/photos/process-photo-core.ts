/**
 * Context-Agnostic Photo Processing Core
 *
 * Shared processing logic that works in BOTH main thread and Web Worker contexts.
 * Uses OffscreenCanvas when available (worker), falls back to regular Canvas (main thread).
 *
 * Graceful degradation chain:
 * 1. compress + watermark
 * 2. compress without watermark (if watermark fails)
 * 3. original file as-is (if compression fails entirely)
 */

export interface PhotoProcessingOptions {
  maxSize?: number;        // Max dimension on longest edge (default: 1920)
  quality?: number;        // JPEG quality 0-1 (default: 0.8)
  timestamp?: Date;        // Timestamp for watermark (default: now)
  gpsCoordinates?: {       // GPS coordinates for watermark (optional)
    lat: number;
    lng: number;
  } | null;
}

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  timestamp: string;
  gpsLat: number | null;
  gpsLng: number | null;
}

const DEFAULT_MAX_SIZE = 1920;
const DEFAULT_QUALITY = 0.8;

/**
 * Calculate new dimensions while maintaining aspect ratio.
 * The longest edge will be at most maxSize.
 */
export function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  if (originalWidth > originalHeight) {
    const ratio = maxSize / originalWidth;
    return {
      width: maxSize,
      height: Math.round(originalHeight * ratio),
    };
  } else {
    const ratio = maxSize / originalHeight;
    return {
      width: Math.round(originalWidth * ratio),
      height: maxSize,
    };
  }
}

/**
 * Read EXIF orientation from an ArrayBuffer.
 * Returns orientation value 1-8 (1 = normal, others = rotated/flipped).
 */
export function getExifOrientation(buffer: ArrayBuffer): number {
  try {
    const view = new DataView(buffer);

    // Check for JPEG marker
    if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) {
      return 1;
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      if (offset + 2 > length) break;

      if (view.getUint16(offset, false) === 0xFFE1) {
        // Found EXIF marker
        if (offset + 4 > length) break;

        // Check for "Exif" string
        if (offset + 8 > length || view.getUint32(offset + 4, false) !== 0x45786966) {
          return 1;
        }

        const tiffOffset = offset + 10;
        if (tiffOffset + 8 > length) return 1;

        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

        // Get IFD0 offset
        const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        if (tiffOffset + ifdOffset + 2 > length) return 1;

        const numEntries = view.getUint16(tiffOffset + ifdOffset, littleEndian);

        // Search for orientation tag (0x0112)
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = tiffOffset + ifdOffset + 2 + (i * 12);
          if (entryOffset + 12 > length) break;

          if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
            return view.getUint16(entryOffset + 8, littleEndian);
          }
        }

        return 1;
      }

      if (offset + 4 > length) break;
      offset += 2 + view.getUint16(offset + 2, false);
    }

    return 1;
  } catch {
    return 1;
  }
}

/**
 * Apply EXIF orientation transformation to canvas context.
 * Accepts both CanvasRenderingContext2D and OffscreenCanvasRenderingContext2D.
 */
export function applyExifOrientation(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2: // Horizontal flip
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180 degree rotation
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4: // Vertical flip
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // 90 CW + horizontal flip
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6: // 90 CW
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -height);
      break;
    case 7: // 90 CCW + horizontal flip
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-width, 0);
      ctx.scale(1, -1);
      break;
    case 8: // 90 CCW
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-width, 0);
      break;
    default:
      // Orientation 1 or unknown - no transformation needed
      break;
  }
}

/**
 * Add watermark to the canvas.
 * Format: "YYYY-MM-DD HH:mm" and optionally "lat, lng"
 * Accepts both CanvasRenderingContext2D and OffscreenCanvasRenderingContext2D.
 */
export function addWatermark(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: Date,
  gpsCoordinates: { lat: number; lng: number } | null
): void {
  const formattedTimestamp = formatTimestamp(timestamp);

  let watermarkText = formattedTimestamp;
  if (gpsCoordinates) {
    const lat = gpsCoordinates.lat.toFixed(6);
    const lng = gpsCoordinates.lng.toFixed(6);
    watermarkText += `\n${lat}, ${lng}`;
  }

  // Calculate font size based on image size (~2% of width, min 12px, max 24px)
  const fontSize = Math.max(12, Math.min(24, Math.round(width * 0.02)));
  const lineHeight = fontSize * 1.3;
  const padding = Math.round(fontSize * 0.75);

  const lines = watermarkText.split('\n');

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  // Calculate text dimensions
  const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
  const textHeight = lines.length * lineHeight;

  // Position in bottom right corner
  const x = width - padding;
  const y = height - padding;

  // Draw semi-transparent background for readability
  const bgPadding = fontSize * 0.3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(
    x - textWidth - bgPadding,
    y - textHeight - bgPadding,
    textWidth + bgPadding * 2,
    textHeight + bgPadding * 2
  );

  // Draw text shadow for additional readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Draw white text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  // Draw each line from bottom to top
  lines.reverse().forEach((line, index) => {
    ctx.fillText(line, x, y - (index * lineHeight));
  });

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Format timestamp as "YYYY-MM-DD HH:mm"
 */
export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Process a photo in either OffscreenCanvas (worker) or regular Canvas (main thread) context.
 *
 * Graceful degradation:
 * - Try compress + watermark
 * - If watermark throws, return compressed photo without watermark
 * - If compression/canvas fails entirely, return original blob as-is
 */
export async function processPhotoInContext(options: {
  buffer: ArrayBuffer;
  maxSize?: number;
  quality?: number;
  timestamp?: Date;
  gpsCoordinates?: { lat: number; lng: number } | null;
  useOffscreen: boolean;
}): Promise<ProcessedPhoto> {
  const {
    buffer,
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    timestamp = new Date(),
    gpsCoordinates = null,
    useOffscreen,
  } = options;

  // Read EXIF orientation
  const orientation = getExifOrientation(buffer);

  try {
    if (useOffscreen) {
      return await processWithOffscreenCanvas(
        buffer, orientation, maxSize, quality, timestamp, gpsCoordinates
      );
    } else {
      return await processWithRegularCanvas(
        buffer, orientation, maxSize, quality, timestamp, gpsCoordinates
      );
    }
  } catch (error) {
    // Compression/canvas failed entirely — return original file as-is
    console.warn('Photo processing failed, returning original file:', error);

    // Attempt to get dimensions from the image for metadata
    let width = 0;
    let height = 0;
    try {
      const bitmap = await createImageBitmap(new Blob([buffer]));
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // Cannot determine dimensions — return zeros
    }

    return {
      blob: new Blob([buffer], { type: 'image/jpeg' }),
      width,
      height,
      timestamp: timestamp.toISOString(),
      gpsLat: gpsCoordinates?.lat ?? null,
      gpsLng: gpsCoordinates?.lng ?? null,
    };
  }
}

/**
 * Process using OffscreenCanvas (for Web Worker context).
 */
async function processWithOffscreenCanvas(
  buffer: ArrayBuffer,
  orientation: number,
  maxSize: number,
  quality: number,
  timestamp: Date,
  gpsCoordinates: { lat: number; lng: number } | null
): Promise<ProcessedPhoto> {
  const bitmap = await createImageBitmap(new Blob([buffer]));

  const isRotated = orientation >= 5 && orientation <= 8;
  const sourceWidth = isRotated ? bitmap.height : bitmap.width;
  const sourceHeight = isRotated ? bitmap.width : bitmap.height;

  const { width, height } = calculateNewDimensions(sourceWidth, sourceHeight, maxSize);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Failed to get OffscreenCanvas 2d context');
  }

  // Apply EXIF orientation
  applyExifOrientation(ctx, orientation, width, height);

  // Draw resized image with orientation applied
  const drawWidth = isRotated ? height : width;
  const drawHeight = isRotated ? width : height;
  ctx.drawImage(bitmap, 0, 0, drawWidth, drawHeight);
  bitmap.close();

  // Reset transformation for watermark
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Try to add watermark (graceful degradation)
  try {
    addWatermark(ctx, width, height, timestamp, gpsCoordinates);
  } catch (watermarkError) {
    console.warn('Watermark failed, returning compressed photo without watermark:', watermarkError);
  }

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

  return {
    blob,
    width,
    height,
    timestamp: timestamp.toISOString(),
    gpsLat: gpsCoordinates?.lat ?? null,
    gpsLng: gpsCoordinates?.lng ?? null,
  };
}

/**
 * Process using regular Canvas (for main thread fallback).
 */
async function processWithRegularCanvas(
  buffer: ArrayBuffer,
  orientation: number,
  maxSize: number,
  quality: number,
  timestamp: Date,
  gpsCoordinates: { lat: number; lng: number } | null
): Promise<ProcessedPhoto> {
  const blob = new Blob([buffer]);
  const objectUrl = URL.createObjectURL(blob);

  return new Promise<ProcessedPhoto>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const isRotated = orientation >= 5 && orientation <= 8;
        const sourceWidth = isRotated ? img.height : img.width;
        const sourceHeight = isRotated ? img.width : img.height;

        const { width, height } = calculateNewDimensions(sourceWidth, sourceHeight, maxSize);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Apply EXIF orientation
        applyExifOrientation(ctx, orientation, width, height);

        // Draw resized image with orientation applied
        const drawWidth = isRotated ? height : width;
        const drawHeight = isRotated ? width : height;
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

        // Reset transformation for watermark
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Try to add watermark (graceful degradation)
        try {
          addWatermark(ctx, width, height, timestamp, gpsCoordinates);
        } catch (watermarkError) {
          console.warn('Watermark failed, returning compressed photo without watermark:', watermarkError);
        }

        // Convert to JPEG blob
        canvas.toBlob(
          (resultBlob) => {
            if (!resultBlob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            resolve({
              blob: resultBlob,
              width,
              height,
              timestamp: timestamp.toISOString(),
              gpsLat: gpsCoordinates?.lat ?? null,
              gpsLng: gpsCoordinates?.lng ?? null,
            });
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}
