'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createFileRecord } from '@/lib/files/actions';
import { useOnlineStatus, queueFileMutation, saveToLocal, type LocalFile } from '@/lib/offline';

interface FileUploadProps {
  taskId: string;
  onUploadComplete?: () => void;
}

interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  error?: string;
}

interface UploadProgress {
  [key: string]: number;
}

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Accepted file extensions (primary check for iOS compatibility)
const ACCEPTED_EXTENSIONS_LIST = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

// Accepted MIME types (secondary check)
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif';

// Check if file is valid (handles iOS where file.type may be empty)
function isValidFileType(file: File): boolean {
  // Check MIME type first
  if (file.type && ACCEPTED_TYPES.includes(file.type)) {
    return true;
  }

  // Fallback to extension check for iOS Safari where file.type can be empty
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ACCEPTED_EXTENSIONS_LIST.includes(ext);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext)) {
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

export function FileUpload({ taskId, onUploadComplete }: FileUploadProps) {
  const isOnline = useOnlineStatus();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('Files uploaded successfully!');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;

      // Check file type (with iOS fallback using extension)
      if (!isValidFileType(file)) {
        newFiles.push({
          id,
          file,
          name: file.name,
          size: file.size,
          error: 'File type not supported',
        });
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({
          id,
          file,
          name: file.name,
          size: file.size,
          error: 'File exceeds 25MB limit',
        });
        continue;
      }

      newFiles.push({
        id,
        file,
        name: file.name,
        size: file.size,
      });
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setError(null);
      setSuccess(false);
    }
  }, []);

  // Handle file picker button click
  const handlePickerClick = () => {
    fileInputRef.current?.click();
  };

  // Remove a selected file
  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Get valid files (no errors)
  const validFiles = selectedFiles.filter(f => !f.error);

  // Upload all selected files
  const uploadFiles = async () => {
    if (validFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    let successCount = 0;
    let failCount = 0;

    // If offline, queue files for later sync
    if (!isOnline) {
      for (const selectedFile of validFiles) {
        try {
          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 10 }));

          // Read file as blob
          const blob = selectedFile.file;
          const tempId = `temp_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 50 }));

          // Queue the file mutation
          await queueFileMutation({
            task_id: taskId,
            blob,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            temp_id: tempId,
          });

          // Create a local file record for optimistic UI
          const localFile: LocalFile = {
            id: tempId,
            task_id: taskId,
            user_id: 'offline_user',
            storage_path: `pending/${tempId}`,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            created_at: new Date().toISOString(),
            local_blob: blob, // Store blob locally for viewing
          };
          await saveToLocal('files', localFile);

          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 100 }));
          successCount++;
        } catch (err) {
          console.error('Queue error:', err);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: -1 }));
        }
      }

      setIsUploading(false);

      if (successCount > 0) {
        setSuccess(true);
        setSuccessMessage(`${successCount} file(s) queued (will sync when online)`);
        setSelectedFiles(prev => prev.filter(f => uploadProgress[f.id] !== 100 && !f.error));
        setUploadProgress({});
        onUploadComplete?.();
      }

      if (failCount > 0) {
        setError(`${failCount} file(s) failed to queue`);
      }
      return;
    }

    // Online: upload to server immediately
    const supabase = createClient();

    for (const selectedFile of validFiles) {
      try {
        // Update progress to show starting
        setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 10 }));

        // Generate unique file path
        const fileExt = selectedFile.name.split('.').pop() || '';
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(fileName, selectedFile.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: -1 }));
          continue;
        }

        // Update progress to show upload complete
        setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 70 }));

        // Create file record in database
        const result = await createFileRecord({
          task_id: taskId,
          storage_path: fileName,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        });

        if (!result.success) {
          console.error('Record creation error:', result.error);
          failCount++;
          setUploadProgress(prev => ({ ...prev, [selectedFile.id]: -1 }));
          continue;
        }

        // Update progress to complete
        setUploadProgress(prev => ({ ...prev, [selectedFile.id]: 100 }));
        successCount++;
      } catch (err) {
        console.error('Upload error:', err);
        failCount++;
        setUploadProgress(prev => ({ ...prev, [selectedFile.id]: -1 }));
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      setSuccess(true);
      setSuccessMessage('Files uploaded successfully!');
      // Clear successfully uploaded files
      setSelectedFiles(prev => prev.filter(f => uploadProgress[f.id] !== 100 && !f.error));
      setUploadProgress({});
      onUploadComplete?.();
    }

    if (failCount > 0) {
      setError(`${failCount} file(s) failed to upload`);
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Upload Files
      </h2>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          // Reset input to allow selecting the same file again
          e.target.value = '';
        }}
      />

      {/* File picker button */}
      <button
        type="button"
        onClick={handlePickerClick}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-2 min-h-[64px] px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
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
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Choose Files
      </button>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
        PDF, DOC, DOCX, XLS, XLSX, or images up to 25MB
      </p>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {selectedFiles.map((selectedFile) => (
            <div
              key={selectedFile.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                selectedFile.error
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50'
              }`}
            >
              {/* File icon */}
              <div className="flex-shrink-0">
                {getFileIcon(selectedFile.name)}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className={`text-xs ${selectedFile.error ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {selectedFile.error || formatFileSize(selectedFile.size)}
                </p>
              </div>

              {/* Progress/Status indicator */}
              {uploadProgress[selectedFile.id] !== undefined && (
                <div className="flex-shrink-0">
                  {uploadProgress[selectedFile.id] === -1 ? (
                    <svg
                      className="w-6 h-6 text-red-500"
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
                  ) : uploadProgress[selectedFile.id] === 100 ? (
                    <svg
                      className="w-6 h-6 text-green-500"
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
                    <div className="w-10 h-10 relative">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="stroke-zinc-200 dark:stroke-zinc-700"
                          strokeWidth="3"
                          fill="none"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          className="stroke-indigo-600"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={100.53}
                          strokeDashoffset={100.53 - (100.53 * uploadProgress[selectedFile.id]) / 100}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {Math.round(uploadProgress[selectedFile.id])}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Remove button (only show when not uploading and no progress) */}
              {!isUploading && uploadProgress[selectedFile.id] === undefined && (
                <button
                  type="button"
                  onClick={() => removeFile(selectedFile.id)}
                  className="flex-shrink-0 p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  aria-label="Remove file"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* Upload button */}
          {validFiles.length > 0 && (
            <button
              type="button"
              onClick={uploadFiles}
              disabled={isUploading || validFiles.length === 0}
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
                  Uploading...
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
                  Upload {validFiles.length} File{validFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
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
