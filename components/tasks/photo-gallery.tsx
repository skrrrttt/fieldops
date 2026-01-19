'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { PhotoWithUser } from '@/lib/photos/actions';

interface PhotoGalleryProps {
  photos: PhotoWithUser[];
}

interface PhotoWithUrl extends PhotoWithUser {
  url: string;
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [photosWithUrls, setPhotosWithUrls] = useState<PhotoWithUrl[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get public URLs for all photos
  useEffect(() => {
    const fetchUrls = async () => {
      if (photos.length === 0) {
        setPhotosWithUrls([]);
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const withUrls: PhotoWithUrl[] = [];

      for (const photo of photos) {
        const { data } = supabase.storage
          .from('photos')
          .getPublicUrl(photo.storage_path);

        withUrls.push({
          ...photo,
          url: data.publicUrl,
        });
      }

      setPhotosWithUrls(withUrls);
      setIsLoading(false);
    };

    fetchUrls();
  }, [photos]);

  // Open lightbox at specific index
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Navigate to previous photo
  const goToPrevious = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || current === 0) {
        return photosWithUrls.length - 1;
      }
      return current - 1;
    });
  }, [photosWithUrls.length]);

  // Navigate to next photo
  const goToNext = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || current === photosWithUrls.length - 1) {
        return 0;
      }
      return current + 1;
    });
  }, [photosWithUrls.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, goToPrevious, goToNext]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatTimestamp(timestamp);
  };

  if (isLoading) {
    return (
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Photos
        </h2>
        <div className="flex items-center justify-center py-8">
          <svg
            className="w-6 h-6 animate-spin text-zinc-400"
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
        </div>
      </section>
    );
  }

  if (photosWithUrls.length === 0) {
    return (
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-700 mb-4">
            <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-zinc-600 dark:text-zinc-400 mb-1">No photos yet</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Tap the upload button above to add photos.
          </p>
        </div>
      </section>
    );
  }

  const currentPhoto = lightboxIndex !== null ? photosWithUrls[lightboxIndex] : null;

  return (
    <>
      {/* Thumbnail Grid Section */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Photos ({photosWithUrls.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photosWithUrls.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => openLightbox(index)}
              className="relative aspect-square group cursor-pointer rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Image
                src={photo.url}
                alt={`Photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={closeLightbox}
        >
          {/* Header with close button and photo counter */}
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {lightboxIndex + 1} / {photosWithUrls.length}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close lightbox"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Main image container */}
          <div
            className="flex-1 flex items-center justify-center relative px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous button */}
            {photosWithUrls.length > 1 && (
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-2 sm:left-4 p-2 sm:p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                aria-label="Previous photo"
              >
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}

            {/* Image */}
            <div className="relative w-full h-[calc(100vh-200px)]">
              <Image
                src={currentPhoto.url}
                alt={`Photo ${lightboxIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Next button */}
            {photosWithUrls.length > 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 sm:right-4 p-2 sm:p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                aria-label="Next photo"
              >
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Metadata footer */}
          <div
            className="p-4 bg-black/50 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Timestamp */}
              <div className="flex items-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{formatTimestamp(currentPhoto.timestamp)}</span>
                <span className="text-zinc-400">
                  ({formatRelativeTime(currentPhoto.created_at)})
                </span>
              </div>

              {/* GPS Coordinates */}
              {currentPhoto.gps_lat && currentPhoto.gps_lng && (
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {currentPhoto.gps_lat.toFixed(6)}, {currentPhoto.gps_lng.toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${currentPhoto.gps_lat},${currentPhoto.gps_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on map
                  </a>
                </div>
              )}

              {/* Uploader */}
              {currentPhoto.user && (
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Uploaded by</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold">
                      {currentPhoto.user.email.charAt(0).toUpperCase()}
                    </div>
                    <span>{currentPhoto.user.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
