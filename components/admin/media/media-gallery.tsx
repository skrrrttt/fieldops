'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PhotoWithTaskInfo } from '@/lib/photos/actions';
import type { Division } from '@/lib/database.types';

interface MediaGalleryProps {
  photos: PhotoWithTaskInfo[];
  tasks: { id: string; title: string }[];
  users: { id: string; email: string }[];
  divisions: Division[];
  initialFilters: {
    taskId: string;
    userId: string;
    divisionId: string;
    startDate: string;
    endDate: string;
  };
}

interface PhotoWithUrl extends PhotoWithTaskInfo {
  url: string;
}

export function MediaGallery({
  photos,
  tasks,
  users,
  divisions,
  initialFilters,
}: MediaGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
  const [filters, setFilters] = useState(initialFilters);

  // Photos with URLs
  const [photosWithUrls, setPhotosWithUrls] = useState<PhotoWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Update URL when filters change
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.taskId) {
      params.set('taskId', filters.taskId);
    } else {
      params.delete('taskId');
    }
    if (filters.userId) {
      params.set('userId', filters.userId);
    } else {
      params.delete('userId');
    }
    if (filters.divisionId) {
      params.set('divisionId', filters.divisionId);
    } else {
      params.delete('divisionId');
    }
    if (filters.startDate) {
      params.set('startDate', filters.startDate);
    } else {
      params.delete('startDate');
    }
    if (filters.endDate) {
      params.set('endDate', filters.endDate);
    } else {
      params.delete('endDate');
    }

    router.push(`/admin/media?${params.toString()}`);
  }, [filters, router, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      taskId: '',
      userId: '',
      divisionId: '',
      startDate: '',
      endDate: '',
    });
    router.push('/admin/media');
  }, [router]);

  // Lightbox functions
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrevious = useCallback(() => {
    setLightboxIndex((current) => {
      if (current === null || current === 0) {
        return photosWithUrls.length - 1;
      }
      return current - 1;
    });
  }, [photosWithUrls.length]);

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
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, goToPrevious, goToNext]);

  // Selection functions
  const toggleSelection = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(photosWithUrls.map((p) => p.id)));
  }, [photosWithUrls]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Download a single photo
  const downloadPhoto = useCallback(async (photo: PhotoWithUrl) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo');
    }
  }, []);

  // Download selected photos as zip
  const downloadSelectedAsZip = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsDownloading(true);

    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const selectedPhotos = photosWithUrls.filter((p) =>
        selectedIds.has(p.id)
      );

      // Download all photos in parallel
      const downloads = selectedPhotos.map(async (photo, index) => {
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const taskTitle = photo.task?.title?.replace(/[^a-z0-9]/gi, '_') || 'task';
          const filename = `${taskTitle}_${index + 1}.jpg`;
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading photo ${photo.id}:`, error);
        }
      });

      await Promise.all(downloads);

      // Generate zip and download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photos-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clear selection after download
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Failed to create zip file');
    } finally {
      setIsDownloading(false);
    }
  }, [selectedIds, photosWithUrls]);

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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatTimestamp(timestamp);
  };

  const currentPhoto =
    lightboxIndex !== null ? photosWithUrls[lightboxIndex] : null;

  const hasActiveFilters =
    filters.taskId ||
    filters.userId ||
    filters.divisionId ||
    filters.startDate ||
    filters.endDate;

  return (
    <>
      {/* Filters Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Task filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Task
            </label>
            <select
              value={filters.taskId}
              onChange={(e) =>
                setFilters({ ...filters, taskId: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Tasks</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Uploaded By
            </label>
            <select
              value={filters.userId}
              onChange={(e) =>
                setFilters({ ...filters, userId: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Division filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Division
            </label>
            <select
              value={filters.divisionId}
              onChange={(e) =>
                setFilters({ ...filters, divisionId: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {photosWithUrls.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedIds.size === photosWithUrls.length &&
                  photosWithUrls.length > 0
                }
                onChange={(e) =>
                  e.target.checked ? selectAll() : deselectAll()
                }
                className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Select All
              </span>
            </label>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {selectedIds.size} of {photosWithUrls.length} selected
            </span>
          </div>

          <button
            onClick={downloadSelectedAsZip}
            disabled={selectedIds.size === 0 || isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
          >
            {isDownloading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                <span>Downloading...</span>
              </>
            ) : (
              <>
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download Selected ({selectedIds.size})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <div className="flex items-center justify-center">
            <svg
              className="w-8 h-8 animate-spin text-zinc-400"
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
        </div>
      ) : photosWithUrls.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto text-zinc-400 mb-4"
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
            <p className="text-zinc-500 dark:text-zinc-400">
              {hasActiveFilters
                ? 'No photos match the selected filters.'
                : 'No photos have been uploaded yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {photosWithUrls.length} photo{photosWithUrls.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {photosWithUrls.map((photo, index) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700"
              >
                {/* Selection checkbox */}
                <label
                  className="absolute top-2 left-2 z-10 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(photo.id)}
                    onChange={() => toggleSelection(photo.id)}
                    className="w-5 h-5 rounded border-2 border-white shadow-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                {/* Photo thumbnail */}
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="w-full h-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo from ${photo.task?.title || 'task'}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
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

                {/* Photo info overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate">
                    {photo.task?.title || 'Unknown task'}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatRelativeTime(photo.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              {/* Download button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPhoto(currentPhoto);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Download photo"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              {/* Close button */}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.url}
              alt={`Photo from ${currentPhoto.task?.title || 'task'}`}
              className="max-h-[calc(100vh-280px)] max-w-full object-contain"
            />

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
              {/* Task info */}
              {currentPhoto.task && (
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <a
                    href={`/tasks/${currentPhoto.task.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentPhoto.task.title}
                  </a>
                  {currentPhoto.task.division && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: currentPhoto.task.division.color + '30',
                        color: currentPhoto.task.division.color,
                      }}
                    >
                      {currentPhoto.task.division.name}
                    </span>
                  )}
                </div>
              )}

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
                    {currentPhoto.gps_lat.toFixed(6)},{' '}
                    {currentPhoto.gps_lng.toFixed(6)}
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
