'use client';

import { useState, useCallback, useRef, useEffect, useTransition, memo } from 'react';
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
// ProStreet brand constants
const PRIMARY_COLOR = '#f97316';
const ACCENT_COLOR = '#64748b';
import { ChevronDown, ChevronRight, Plus, Camera, Image, FileText, MessageCircle, MapPin, Calendar, User, X, ClipboardList } from 'lucide-react';

interface TaskDetailProps {
  task: TaskWithRelations;
  photos: PhotoWithUser[];
  files: FileWithUser[];
  comments: CommentWithUser[];
  customFields: CustomFieldDefinition[];
}

export function TaskDetail({ task, photos, files, comments: initialComments, customFields }: TaskDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);

  // Collapsible section states
  const [showComments, setShowComments] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handlePhotoUploadComplete = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setShowPhotoUpload(false);
    // Use startTransition for non-blocking refresh
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleFileUploadComplete = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setShowFileUpload(false);
    // Use startTransition for non-blocking refresh
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleCommentAdded = useCallback((newComment: CommentWithUser) => {
    setComments(prev => [newComment, ...prev]);
    setShowCommentInput(false);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    !task.status?.is_complete;

  const hasLocation = task.location_lat && task.location_lng;

  const getDirectionsUrl = () => {
    if (hasLocation) {
      return `https://www.google.com/maps/dir/?api=1&destination=${task.location_lat},${task.location_lng}`;
    }
    if (task.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`;
    }
    return null;
  };

  const directionsUrl = getDirectionsUrl();

  // Get assigned custom fields
  const assignedFieldIds = (task as { assigned_field_ids?: string[] | null }).assigned_field_ids || [];
  const assignedFields = customFields.filter(f => assignedFieldIds.includes(f.id));

  return (
    <div className="space-y-3 pb-4">
      {/* Consolidated Header: Title, Status, Division, Description */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        {/* Title and Status Row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
            {task.title}
          </h1>
          {task.status && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: `${task.status.color}20`,
                color: task.status.color,
              }}
            >
              {task.status.name}
            </span>
          )}
        </div>

        {/* Division + Due Date Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {task.division && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${task.division.color}15`,
                color: task.division.color,
              }}
            >
              {task.division.icon && <span className="mr-1">{task.division.icon}</span>}
              {task.division.name}
            </span>
          )}
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              isOverdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
              {isOverdue && <span className="text-red-600">(Overdue)</span>}
            </span>
          )}
          {task.assigned_user && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <User className="w-3 h-3" />
              {task.assigned_user.display_name || task.assigned_user.email.split('@')[0]}
            </span>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
            {task.description}
          </p>
        )}
      </section>

      {/* Specifications Section - Read Only for Field Users */}
      {task.specifications && (
        <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-zinc-400" />
            Specifications
          </h2>
          <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-700">
            {task.specifications}
          </div>
        </section>
      )}

      {/* Location Section - Compact */}
      {(task.address || hasLocation) && (
        <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                {task.address || `${task.location_lat?.toFixed(4)}, ${task.location_lng?.toFixed(4)}`}
              </span>
            </div>
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ml-2 flex-shrink-0"
                style={{
                  backgroundColor: PRIMARY_COLOR,
                  color: '#ffffff',
                }}
              >
                <MapPin className="w-4 h-4" />
                Directions
              </a>
            )}
          </div>
        </section>
      )}

      {/* Photos Section with Inline Add */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-zinc-400" />
            Photos {photos.length > 0 && <span className="text-zinc-400">({photos.length})</span>}
          </h2>
          <button
            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: showPhotoUpload ? `${PRIMARY_COLOR}20` : 'transparent',
              color: PRIMARY_COLOR,
            }}
          >
            {showPhotoUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showPhotoUpload ? 'Cancel' : 'Add'}
          </button>
        </div>

        {/* Inline Photo Upload */}
        {showPhotoUpload && (
          <div className="px-4 pt-3">
            <PhotoUpload
              key={refreshKey}
              taskId={task.id}
              onUploadComplete={handlePhotoUploadComplete}
            />
          </div>
        )}

        {/* Photo Gallery */}
        <div className="p-4 pt-3">
          {photos.length > 0 ? (
            <PhotoGalleryInline key={`gallery-${refreshKey}`} photos={photos} />
          ) : (
            <div className="text-center py-6 text-zinc-400">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photos yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Files Section with Inline Add */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            Files {files.length > 0 && <span className="text-zinc-400">({files.length})</span>}
          </h2>
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: showFileUpload ? `${PRIMARY_COLOR}20` : 'transparent',
              color: PRIMARY_COLOR,
            }}
          >
            {showFileUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showFileUpload ? 'Cancel' : 'Add'}
          </button>
        </div>

        {/* Inline File Upload */}
        {showFileUpload && (
          <div className="px-4 pt-3">
            <FileUpload
              key={`files-${refreshKey}`}
              taskId={task.id}
              onUploadComplete={handleFileUploadComplete}
            />
          </div>
        )}

        {/* File List */}
        <div className="p-4 pt-3">
          {files.length > 0 ? (
            <FileListInline key={`filelist-${refreshKey}`} files={files} />
          ) : (
            <div className="text-center py-6 text-zinc-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Comments Section - Collapsible */}
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-between w-full p-4 text-left"
        >
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-zinc-400" />
            Comments {comments.length > 0 && <span className="text-zinc-400">({comments.length})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCommentInput(!showCommentInput);
                if (!showComments) setShowComments(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: showCommentInput ? `${PRIMARY_COLOR}20` : 'transparent',
                color: PRIMARY_COLOR,
              }}
            >
              {showCommentInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            {showComments ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>

        {/* Comment Input */}
        {showCommentInput && (
          <div className="px-4 pb-4">
            <CommentInputInline taskId={task.id} onCommentAdded={handleCommentAdded} />
          </div>
        )}

        {/* Comments List */}
        {showComments && comments.length > 0 && (
          <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 pt-4">
            <CommentListInline comments={comments} />
          </div>
        )}

        {showComments && comments.length === 0 && !showCommentInput && (
          <div className="px-4 pb-4 text-center text-zinc-400">
            <p className="text-sm">No comments yet. Tap + to add one.</p>
          </div>
        )}
      </section>

      {/* Custom Fields Section */}
      {assignedFields.length > 0 && (
        <CustomFieldEdit
          taskId={task.id}
          customFields={assignedFields}
          initialValues={(task.custom_fields as Record<string, unknown>) || {}}
        />
      )}

      {/* Fixed Update Status Button at Bottom - positioned above mobile bottom nav */}
      <div className="fixed left-0 right-0 p-4 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 shadow-lg bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+8px)] md:bottom-0">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/tasks/${task.id}/status`}
            className="flex items-center justify-center gap-2 w-full min-h-[56px] px-6 py-3 text-lg font-semibold rounded-lg transition-opacity hover:opacity-90"
            style={{
              backgroundColor: ACCENT_COLOR,
              color: '#ffffff',
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

// Inline Photo Gallery (simplified, without outer section wrapper)
const PhotoGalleryInline = memo(function PhotoGalleryInline({ photos }: { photos: PhotoWithUser[] }) {
  const [photosWithUrls, setPhotosWithUrls] = useState<Array<PhotoWithUser & { url: string }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchUrls = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const withUrls = photos.map(photo => {
        const { data } = supabase.storage.from('photos').getPublicUrl(photo.storage_path);
        return { ...photo, url: data.publicUrl };
      });
      setPhotosWithUrls(withUrls);
    };
    fetchUrls();
  }, [photos]);

  if (photosWithUrls.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {photosWithUrls.slice(0, 8).map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {index === 7 && photosWithUrls.length > 8 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                +{photosWithUrls.length - 8}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(i => i === 0 ? photosWithUrls.length - 1 : (i ?? 0) - 1);
            }}
          >
            <ChevronRight className="w-10 h-10 rotate-180" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photosWithUrls[lightboxIndex]?.url}
            alt=""
            className="max-h-[80vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(i => i === photosWithUrls.length - 1 ? 0 : (i ?? 0) + 1);
            }}
          >
            <ChevronRight className="w-10 h-10" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {lightboxIndex + 1} / {photosWithUrls.length}
          </div>
        </div>
      )}
    </>
  );
});

// Inline File List (simplified, without outer section wrapper)
const FileListInline = memo(function FileListInline({ files }: { files: FileWithUser[] }) {
  const getFileUrl = (storagePath: string): string => {
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();
    const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleFileClick = (file: FileWithUser) => {
    const url = getFileUrl(file.storage_path);
    window.open(url, '_blank');
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center text-red-600 text-xs font-bold">PDF</div>;
    if (['doc', 'docx'].includes(ext)) return <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-600 text-xs font-bold">DOC</div>;
    if (['xls', 'xlsx'].includes(ext)) return <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center text-green-600 text-xs font-bold">XLS</div>;
    return <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-700 rounded flex items-center justify-center"><FileText className="w-4 h-4 text-zinc-400" /></div>;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => handleFileClick(file)}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors text-left"
        >
          {getFileIcon(file.file_name)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
              {file.file_name}
            </p>
            <p className="text-xs text-zinc-500">{formatSize(file.file_size)}</p>
          </div>
        </button>
      ))}
    </div>
  );
});

// Inline Comment Input (simplified)
const CommentInputInline = memo(function CommentInputInline({ taskId, onCommentAdded }: { taskId: string; onCommentAdded: (comment: CommentWithUser) => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { createComment } = await import('@/lib/comments/actions');
      const result = await createComment({ task_id: taskId, content: content.trim() });
      if (result.success && result.data) {
        setContent('');
        onCommentAdded(result.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400"
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '...' : 'Post'}
      </button>
    </form>
  );
});

// Inline Comment List (simplified)
const CommentListInline = memo(function CommentListInline({ comments }: { comments: CommentWithUser[] }) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getUserDisplayName = (user: CommentWithUser['user']) => {
    if (!user) return 'Unknown';
    return user.display_name || user.email?.split('@')[0] || 'Unknown';
  };

  const getUserInitial = (user: CommentWithUser['user']) => {
    if (!user) return '?';
    if (user.display_name) return user.display_name.charAt(0).toUpperCase();
    return user.email?.charAt(0).toUpperCase() || '?';
  };

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          {comment.user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.user.avatar_url}
              alt={getUserDisplayName(comment.user)}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold flex-shrink-0">
              {getUserInitial(comment.user)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {getUserDisplayName(comment.user)}
              </span>
              <span className="text-xs text-zinc-400">{formatTime(comment.created_at)}</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 break-words">
              {comment.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
});
