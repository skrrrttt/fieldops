'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TaskWithRelations } from '@/lib/tasks/actions';
import type { PhotoWithUser } from '@/lib/photos/actions';
import type { FileWithUser } from '@/lib/files/actions';
import type { CommentWithUser } from '@/lib/comments/actions';
import type { CustomFieldDefinition } from '@/lib/database.types';
import { PhotoUpload } from '@/components/tasks/photo-upload';
import { PhotoGallery } from '@/components/tasks/photo-gallery';
import { FileUpload } from '@/components/tasks/file-upload';
import { FileList } from '@/components/tasks/file-list';
import { CommentInput } from '@/components/tasks/comment-input';
import { CommentList } from '@/components/tasks/comment-list';
import { CustomFieldEdit } from '@/components/tasks/custom-field-edit';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';

interface TaskDetailProps {
  task: TaskWithRelations;
  photos: PhotoWithUser[];
  files: FileWithUser[];
  comments: CommentWithUser[];
  customFields: CustomFieldDefinition[];
}

export function TaskDetail({ task, photos, files, comments: initialComments, customFields }: TaskDetailProps) {
  const router = useRouter();
  const { branding } = useBranding();
  const [refreshKey, setRefreshKey] = useState(0);
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);

  const handlePhotoUploadComplete = useCallback(() => {
    // Refresh the page to show newly uploaded photos
    setRefreshKey(prev => prev + 1);
    router.refresh();
  }, [router]);

  const handleFileUploadComplete = useCallback(() => {
    // Refresh the page to show newly uploaded files
    setRefreshKey(prev => prev + 1);
    router.refresh();
  }, [router]);

  const handleCommentAdded = useCallback((newComment: CommentWithUser) => {
    // Add new comment to the beginning of the list (newest first)
    setComments(prev => [newComment, ...prev]);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    !task.status?.is_complete;

  const hasLocation = task.location_lat && task.location_lng;

  // Build Google Maps URL for directions
  const getDirectionsUrl = () => {
    if (hasLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${task.location_lat},${task.location_lng}`;
    }
    if (task.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`;
    }
    return null;
  };

  // Build static map embed URL using OpenStreetMap
  const getMapPreviewUrl = () => {
    if (!hasLocation) return null;
    const lat = task.location_lat!;
    const lng = task.location_lng!;
    // Using OpenStreetMap embed with a bounding box around the location
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`;
  };

  const directionsUrl = getDirectionsUrl();
  const mapEmbedUrl = getMapPreviewUrl();

  return (
    <div className="space-y-4">
      {/* 1. Title, Status and Description */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {task.title}
          </h1>
          {task.status && (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: `${task.status.color}20`,
                color: task.status.color,
              }}
            >
              {task.status.name}
            </span>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-base text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
            {task.description}
          </p>
        )}
      </section>

      {/* 2. Division */}
      {task.division && (
        <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
          <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Division
          </dt>
          <dd>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium"
              style={{
                backgroundColor: `${task.division.color}15`,
                color: task.division.color,
                border: `1px solid ${task.division.color}40`,
              }}
            >
              {task.division.icon && (
                <span className="mr-1.5">{task.division.icon}</span>
              )}
              {task.division.name}
            </span>
          </dd>
        </section>
      )}

      {/* 3. Comments Section */}
      <CommentInput taskId={task.id} onCommentAdded={handleCommentAdded} />
      <CommentList comments={comments} />

      {/* 4. Photo Upload and Gallery */}
      <PhotoUpload
        key={refreshKey}
        taskId={task.id}
        onUploadComplete={handlePhotoUploadComplete}
      />
      <PhotoGallery key={`gallery-${refreshKey}`} photos={photos} />

      {/* 5. File Upload and List */}
      <FileUpload
        key={`files-${refreshKey}`}
        taskId={task.id}
        onUploadComplete={handleFileUploadComplete}
      />
      <FileList key={`filelist-${refreshKey}`} files={files} />

      {/* 6. Custom Fields Section - Editable for field users */}
      {customFields.length > 0 && (
        <CustomFieldEdit
          taskId={task.id}
          customFields={customFields}
          initialValues={(task.custom_fields as Record<string, unknown>) || {}}
        />
      )}

      {/* 7. Additional Details - Due Date, Assigned User */}
      {(task.due_date || task.assigned_user) && (
        <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
            Details
          </h2>
          <div className="space-y-4">
            {/* Due Date */}
            {task.due_date && (
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Due Date
                </dt>
                <dd
                  className={`text-base font-medium flex items-center gap-2 ${
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-zinc-900 dark:text-white'
                  }`}
                >
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDate(task.due_date)}
                  {isOverdue && (
                    <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">
                      Overdue
                    </span>
                  )}
                </dd>
              </div>
            )}

            {/* Assigned User */}
            {task.assigned_user && (
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Assigned To
                </dt>
                <dd className="flex items-center gap-2 text-base text-zinc-900 dark:text-white">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{
                      backgroundColor: `${branding.primary_color}20`,
                      color: branding.primary_color,
                    }}
                  >
                    {task.assigned_user.email.charAt(0).toUpperCase()}
                  </div>
                  <span>{task.assigned_user.email}</span>
                </dd>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8. Location Section */}
      {(task.address || hasLocation) && (
        <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              Location
            </h2>

            {/* Address */}
            {task.address && (
              <div className="flex items-start gap-2 mb-4">
                <svg
                  className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0"
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
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {task.address}
                </span>
              </div>
            )}

            {/* Coordinates */}
            {hasLocation && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Coordinates: {task.location_lat?.toFixed(6)},{' '}
                {task.location_lng?.toFixed(6)}
              </div>
            )}

            {/* Get Directions Button */}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] px-6 py-3 font-medium rounded-lg transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: branding.primary_color,
                  color: getContrastColor(branding.primary_color),
                }}
              >
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Get Directions
              </a>
            )}
          </div>

          {/* Map Preview */}
          {mapEmbedUrl && (
            <div className="border-t border-zinc-200 dark:border-zinc-700">
              <iframe
                title="Job Location Map"
                src={mapEmbedUrl}
                width="100%"
                height="200"
                className="block"
                style={{ border: 'none' }}
              />
            </div>
          )}
        </section>
      )}

      {/* Fixed Update Status Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/tasks/${task.id}/status`}
            className="flex items-center justify-center gap-2 w-full min-h-[64px] px-6 py-4 text-lg font-semibold rounded-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: branding.accent_color,
              color: getContrastColor(branding.accent_color),
            }}
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Update Status
          </Link>
        </div>
      </div>
    </div>
  );
}
