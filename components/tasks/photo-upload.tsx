'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createPhotoRecord } from '@/lib/photos/actions';
import { processPhoto, requestGpsCoordinates } from '@/lib/photos/process-photo';
import { useOnlineStatus, queuePhotoMutation, saveToLocal, type LocalPhoto } from '@/lib/offline';

interface PhotoUploadProps {
  taskId: string;
  onUploadComplete?: () => void;
}

interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
}

interface GpsCoordinates {
  lat: number;
  lng: number;
}

interface UploadProgress {
  [key: string]: number;
}

export function PhotoUpload({ taskId, onUploadComplete }: PhotoUploadProps) {
  const isOnline = useOnlineStatus();
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('Photos uploaded successfully!');
  const [gpsCoordinates, setGpsCoordinates] = useState<GpsCoordinates | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const gpsRequestedRef = useRef(false);

  // Request GPS coordinates when photos are first selected
  useEffect(() => {
    if (selectedPhotos.length > 0 && !gpsRequestedRef.current) {
      gpsRequestedRef.current = true;
      requestGpsCoordinates().then((coords) => {
        if (coords) {
          setGpsCoordinates(coords);
        }
      });
    }
  }, [selectedPhotos.length]);

  // Handle file selection (from either camera or gallery)
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: SelectedPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Only accept image files
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const id = `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(file);

      newPhotos.push({ id, file, preview });
    }

    if (newPhotos.length > 0) {
      setSelectedPhotos(prev => [...prev, ...newPhotos]);
      setError(null);
      setSuccess(false);
    }
  }, []);

  // Handle camera button click
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  // Handle gallery button click
  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  // Remove a selected photo
  const removePhoto = useCallback((id: string) => {
    setSelectedPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // Upload all selected photos
  const uploadPhotos = async () => {
    if (selectedPhotos.length === 0) return;

    setIsUploading(true);
    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    let successCount = 0;
    let failCount = 0;

    // If offline, queue photos for later sync
    if (!isOnline) {
      for (const photo of selectedPhotos) {
        try {
          // Update progress to show processing
          setUploadProgress(prev => ({ ...prev, [photo.id]: 5 }));

          // Process photo: resize, compress, and add watermark
          const timestamp = new Date();
          const processed = await processPhoto(photo.file, {
            maxSize: 1920,
            quality: 0.8,
            timestamp,
            gpsCoordinates,
          });

          setIsProcessing(false);
          setUploadProgress(prev => ({ ...prev, [photo.id]: 50 }));

          const tempId = `temp_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Queue the photo mutation with the processed blob
          await queuePhotoMutation({
            task_id: taskId,
            blob: processed.blob,
            timestamp: processed.timestamp,
            gps_lat: processed.gpsLat,
            gps_lng: processed.gpsLng,
            temp_id: tempId,
          });

          // Create a local photo record for optimistic UI
          const localPhoto: LocalPhoto = {
            id: tempId,
            task_id: taskId,
            user_id: 'offline_user',
            storage_path: `pending/${tempId}`,
            timestamp: processed.timestamp,
            gps_lat: processed.gpsLat,
            gps_lng: processed.gpsLng,
            created_at: new Date().toISOString(),
            local_blob: processed.blob, // Store blob locally for viewing
          };
          await saveToLocal('photos', localPhoto);

          setUploadProgress(prev => ({ ...prev, [photo.id]: 100 }));
          successCount++;

          // Clean up preview URL
          URL.revokeObjectURL(photo.preview);
        } catch (err) {
          console.error('Queue error:', err);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [photo.id]: -1 }));
        }
      }

      setIsUploading(false);
      setIsProcessing(false);

      if (successCount > 0) {
        setSuccess(true);
        setSuccessMessage(`${successCount} photo(s) queued (will sync when online)`);
        setSelectedPhotos(prev => prev.filter(p => uploadProgress[p.id] !== 100));
        setUploadProgress({});
        onUploadComplete?.();
      }

      if (failCount > 0) {
        setError(`${failCount} photo(s) failed to queue`);
      }
      return;
    }

    // Online: upload to server immediately
    const supabase = createClient();

    for (const photo of selectedPhotos) {
      try {
        // Update progress to show processing
        setUploadProgress(prev => ({ ...prev, [photo.id]: 5 }));

        // Process photo: resize, compress, and add watermark
        const timestamp = new Date();
        const processed = await processPhoto(photo.file, {
          maxSize: 1920,
          quality: 0.8,
          timestamp,
          gpsCoordinates,
        });

        setIsProcessing(false);
        setUploadProgress(prev => ({ ...prev, [photo.id]: 20 }));

        // Generate unique file path (always use .jpg since we convert to JPEG)
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

        // Upload processed blob to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, processed.blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [photo.id]: -1 }));
          continue;
        }

        // Update progress to show upload complete
        setUploadProgress(prev => ({ ...prev, [photo.id]: 80 }));

        // Create photo record in database with GPS coordinates
        const result = await createPhotoRecord({
          task_id: taskId,
          storage_path: fileName,
          timestamp: processed.timestamp,
          gps_lat: processed.gpsLat,
          gps_lng: processed.gpsLng,
        });

        if (!result.success) {
          console.error('Record creation error:', result.error);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [photo.id]: -1 }));
          continue;
        }

        // Update progress to complete
        setUploadProgress(prev => ({ ...prev, [photo.id]: 100 }));
        successCount++;

        // Clean up preview URL
        URL.revokeObjectURL(photo.preview);
      } catch (err) {
        console.error('Upload error:', err);
        failCount++;
        setUploadProgress(prev => ({ ...prev, [photo.id]: -1 }));
      }
    }

    setIsUploading(false);
    setIsProcessing(false);

    if (successCount > 0) {
      setSuccess(true);
      setSuccessMessage('Photos uploaded successfully!');
      // Clear successfully uploaded photos
      setSelectedPhotos(prev => prev.filter(p => uploadProgress[p.id] !== 100));
      setUploadProgress({});
      onUploadComplete?.();
    }

    if (failCount > 0) {
      setError(`${failCount} photo(s) failed to upload`);
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Upload Photos
      </h2>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 min-h-[64px] px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Take Photo
        </button>

        <button
          type="button"
          onClick={handleGalleryClick}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 min-h-[64px] px-4 py-3 bg-zinc-600 hover:bg-zinc-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Gallery
        </button>
      </div>

      {/* Selected photos grid */}
      {selectedPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {selectedPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt="Selected photo"
                  className="w-full h-full object-cover rounded-lg"
                />

                {/* Progress overlay */}
                {uploadProgress[photo.id] !== undefined && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    {uploadProgress[photo.id] === -1 ? (
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : uploadProgress[photo.id] === 100 ? (
                      <svg
                        className="w-8 h-8 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-16 h-16 relative">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className="stroke-white/30"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className="stroke-white"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={175.93}
                            strokeDashoffset={175.93 - (175.93 * uploadProgress[photo.id]) / 100}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
                          {Math.round(uploadProgress[photo.id])}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Remove button (only show when not uploading) */}
                {!isUploading && uploadProgress[photo.id] === undefined && (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          <button
            type="button"
            onClick={uploadPhotos}
            disabled={isUploading || selectedPhotos.length === 0}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
          >
            {isUploading ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {isProcessing ? 'Processing...' : 'Uploading...'}
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload {selectedPhotos.length} Photo{selectedPhotos.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className={`mt-4 p-3 border rounded-lg text-sm ${
          successMessage.includes('queued')
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
        }`}>
          {successMessage}
        </div>
      )}
    </section>
  );
}
