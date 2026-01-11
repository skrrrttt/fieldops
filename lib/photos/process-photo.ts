/**
 * Photo Processing Utility
 *
 * Handles client-side photo processing:
 * - Resizing to max 1920px on longest edge
 * - JPEG compression at 80% quality
 * - Watermarking with timestamp and GPS coordinates
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
 * Process a photo file: resize, compress, and add watermark
 */
export async function processPhoto(
  file: File,
  options: PhotoProcessingOptions = {}
): Promise<ProcessedPhoto> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    timestamp = new Date(),
    gpsCoordinates = null,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        // Calculate new dimensions
        const { width, height } = calculateNewDimensions(
          img.width,
          img.height,
          maxSize
        );

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Add watermark
        addWatermark(ctx, width, height, timestamp, gpsCoordinates);

        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            resolve({
              blob,
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

/**
 * Calculate new dimensions while maintaining aspect ratio
 * The longest edge will be at most maxSize
 */
function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  // If image is smaller than max size, return original dimensions
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }

  // Determine which dimension is the longest
  if (originalWidth > originalHeight) {
    // Landscape: scale based on width
    const ratio = maxSize / originalWidth;
    return {
      width: maxSize,
      height: Math.round(originalHeight * ratio),
    };
  } else {
    // Portrait or square: scale based on height
    const ratio = maxSize / originalHeight;
    return {
      width: Math.round(originalWidth * ratio),
      height: maxSize,
    };
  }
}

/**
 * Add watermark to the canvas
 * Format: "YYYY-MM-DD HH:mm" and optionally "lat, lng"
 */
function addWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: Date,
  gpsCoordinates: { lat: number; lng: number } | null
): void {
  // Format timestamp: YYYY-MM-DD HH:mm
  const formattedTimestamp = formatTimestamp(timestamp);

  // Build watermark text
  let watermarkText = formattedTimestamp;
  if (gpsCoordinates) {
    const lat = gpsCoordinates.lat.toFixed(6);
    const lng = gpsCoordinates.lng.toFixed(6);
    watermarkText += `\n${lat}, ${lng}`;
  }

  // Calculate font size based on image size
  // Use ~2% of the image width, with min 12px and max 24px
  const fontSize = Math.max(12, Math.min(24, Math.round(width * 0.02)));
  const lineHeight = fontSize * 1.3;
  const padding = Math.round(fontSize * 0.75);

  // Split text into lines
  const lines = watermarkText.split('\n');

  // Set font
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
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Request GPS coordinates from the browser
 * Returns null if permission denied or unavailable
 */
export async function requestGpsCoordinates(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Permission denied or error - proceed without GPS
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Use cached position up to 1 minute old
      }
    );
  });
}
