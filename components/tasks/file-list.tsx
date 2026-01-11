'use client';

import { createClient } from '@/lib/supabase/client';
import type { FileWithUser } from '@/lib/files/actions';

interface FileListProps {
  files: FileWithUser[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getFileIcon(fileName: string): React.ReactNode {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['pdf'].includes(ext)) {
    return (
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 18a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5H10a1.5 1.5 0 1 1 0 3H9v.5a.5.5 0 0 1-.5.5zm1.5-2H9v-1h1a.5.5 0 0 1 0 1zm3.5 2a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5H15a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 15 17h-1.5zm1-1H15a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-.5v2z"/>
      </svg>
    );
  }

  if (['doc', 'docx'].includes(ext)) {
    return (
      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 17h8v1H8v-1zm0-2h8v1H8v-1zm0-2h8v1H8v-1z"/>
      </svg>
    );
  }

  if (['xls', 'xlsx'].includes(ext)) {
    return (
      <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 15h2v2H8v-2zm0-3h2v2H8v-2zm3 3h2v2h-2v-2zm0-3h2v2h-2v-2zm3 3h2v2h-2v-2zm0-3h2v2h-2v-2z"/>
      </svg>
    );
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return (
      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// Check if file type is viewable in browser
function isViewableInBrowser(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
  return viewableTypes.includes(ext);
}

export function FileList({ files }: FileListProps) {
  const supabase = createClient();

  // Get public URL for a file
  const getFileUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // Handle file click - open in new tab if viewable, otherwise download
  const handleFileClick = (file: FileWithUser) => {
    const url = getFileUrl(file.storage_path);
    if (isViewableInBrowser(file.file_name)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      handleDownload(file);
    }
  };

  // Handle explicit download
  const handleDownload = (file: FileWithUser) => {
    const url = getFileUrl(file.storage_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (files.length === 0) {
    return (
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Files
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No files attached to this task
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Files ({files.length})
      </h2>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {/* File icon */}
            <button
              type="button"
              onClick={() => handleFileClick(file)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
              aria-label={`Open ${file.file_name}`}
            >
              {getFileIcon(file.file_name)}
            </button>

            {/* File info - clickable to open/download */}
            <button
              type="button"
              onClick={() => handleFileClick(file)}
              className="flex-1 min-w-0 text-left"
            >
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {file.file_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{formatRelativeDate(file.created_at)}</span>
                {file.user && (
                  <>
                    <span>•</span>
                    <span className="truncate">{file.user.email}</span>
                  </>
                )}
              </div>
            </button>

            {/* Download button */}
            <button
              type="button"
              onClick={() => handleDownload(file)}
              className="flex-shrink-0 p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label={`Download ${file.file_name}`}
              title="Download"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
