'use client';

/**
 * Quick Upload Page
 * Camera-first flow: Take photo → Select task → Done
 * Optimized for field workers who need to quickly capture and assign photos
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, ChevronLeft, Check, X, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createPhotoRecord } from '@/lib/photos/actions';
import { processPhoto, requestGpsCoordinates } from '@/lib/photos/process-photo';
import { useOnlineStatus, queuePhotoMutation, saveToLocal, type LocalPhoto } from '@/lib/offline';
// ProStreet brand constant
const PRIMARY_COLOR = '#f97316';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

interface Task {
  id: string;
  title: string;
  division?: { name: string; icon?: string } | null;
  status?: { name: string; color: string } | null;
}

interface GpsCoordinates {
  lat: number;
  lng: number;
}

type Step = 'capture' | 'select-task' | 'uploading' | 'done';

export default function UploadPage() {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [step, setStep] = useState<Step>('capture');
  const [capturedPhoto, setCapturedPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<GpsCoordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Request GPS when component mounts
  useEffect(() => {
    requestGpsCoordinates().then((coords) => {
      if (coords) {
        setGpsCoordinates(coords);
      }
    });
  }, []);

  // Fetch tasks when moving to select-task step
  useEffect(() => {
    if (step === 'select-task' && tasks.length === 0) {
      fetchTasks();
    }
  }, [step, tasks.length]);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          division:divisions(name, icon),
          status:statuses(name, color)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Check if file is an image
  const isImageFile = useCallback((file: File): boolean => {
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext);
  }, []);

  // Handle photo capture/selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!isImageFile(file)) {
      setError('Please select an image file');
      return;
    }

    const preview = URL.createObjectURL(file);
    setCapturedPhoto({ file, preview });
    setStep('select-task');
    setError(null);
  }, [isImageFile]);

  // Upload the photo to selected task
  const uploadPhoto = async () => {
    if (!capturedPhoto || !selectedTaskId) return;

    setStep('uploading');
    setUploadProgress(10);
    setError(null);

    try {
      // Process photo
      const timestamp = new Date();
      const processed = await processPhoto(capturedPhoto.file, {
        maxSize: 1920,
        quality: 0.8,
        timestamp,
        gpsCoordinates,
      });

      setUploadProgress(40);

      if (!isOnline) {
        // Queue for offline sync
        const tempId = `temp_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await queuePhotoMutation({
          task_id: selectedTaskId,
          blob: processed.blob,
          timestamp: processed.timestamp,
          gps_lat: processed.gpsLat,
          gps_lng: processed.gpsLng,
          temp_id: tempId,
        });

        const localPhoto: LocalPhoto = {
          id: tempId,
          task_id: selectedTaskId,
          user_id: 'offline_user',
          storage_path: `pending/${tempId}`,
          timestamp: processed.timestamp,
          gps_lat: processed.gpsLat,
          gps_lng: processed.gpsLng,
          created_at: new Date().toISOString(),
          local_blob: processed.blob,
        };
        await saveToLocal('photos', localPhoto);

        setUploadProgress(100);
        setStep('done');
        return;
      }

      // Online upload
      const supabase = createClient();
      const fileName = `${selectedTaskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, processed.blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      const result = await createPhotoRecord({
        task_id: selectedTaskId,
        storage_path: fileName,
        timestamp: processed.timestamp,
        gps_lat: processed.gpsLat,
        gps_lng: processed.gpsLng,
      });

      if (!result.success) throw new Error(result.error);

      setUploadProgress(100);
      setStep('done');

      // Clean up preview URL
      URL.revokeObjectURL(capturedPhoto.preview);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
      setStep('select-task');
    }
  };

  // Reset and start over
  const resetUpload = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.preview);
    }
    setCapturedPhoto(null);
    setSelectedTaskId(null);
    setStep('capture');
    setUploadProgress(0);
    setError(null);
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => step === 'capture' ? router.back() : resetUpload()}
            className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{step === 'capture' ? 'Back' : 'Cancel'}</span>
          </button>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {step === 'capture' && 'Take Photo'}
            {step === 'select-task' && 'Select Task'}
            {step === 'uploading' && 'Uploading'}
            {step === 'done' && 'Done'}
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Step 1: Capture */}
        {step === 'capture' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            <div className="text-center mb-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
              >
                <Camera className="w-12 h-12" style={{ color: PRIMARY_COLOR }} />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Capture a Photo
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Take a new photo or select from your gallery
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white font-semibold text-lg shadow-lg active:scale-[0.98] transition-transform"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                <Camera className="w-6 h-6" />
                Take Photo
              </button>

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-lg border border-zinc-200 dark:border-zinc-700 active:scale-[0.98] transition-transform"
              >
                <ImagePlus className="w-6 h-6" />
                Choose from Gallery
              </button>
            </div>

            {gpsCoordinates && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                <MapPin className="w-3.5 h-3.5" />
                <span>Location enabled</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Task */}
        {step === 'select-task' && (
          <div className="flex-1 flex flex-col">
            {/* Photo preview */}
            {capturedPhoto && (
              <div className="relative mx-4 mt-4 rounded-xl overflow-hidden shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhoto.preview}
                  alt="Captured photo"
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={resetUpload}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            )}

            {/* Task selector */}
            <div className="flex-1 flex flex-col p-4">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Which task is this for?
              </label>

              {/* Search input */}
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white mb-3 text-base"
              />

              {/* Task list */}
              <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-2">
                {isLoadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    {searchQuery ? 'No tasks match your search' : 'No tasks available'}
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        selectedTaskId === task.id
                          ? 'bg-white dark:bg-zinc-800 shadow-md'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                      }`}
                      style={selectedTaskId === task.id ? {
                        boxShadow: `0 0 0 2px ${PRIMARY_COLOR}`,
                      } : undefined}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                            {task.title}
                          </h3>
                          {task.division && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {task.division.icon} {task.division.name}
                            </p>
                          )}
                        </div>
                        {selectedTaskId === task.id && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: PRIMARY_COLOR }}
                          >
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={uploadPhoto}
                disabled={!selectedTaskId}
                className="mt-4 w-full py-4 rounded-xl text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Uploading */}
        {step === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-32 h-32 relative mb-6">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={PRIMARY_COLOR}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={351.86}
                  strokeDashoffset={351.86 - (351.86 * uploadProgress) / 100}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-zinc-900 dark:text-white">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">
              {uploadProgress < 40 ? 'Processing photo...' : 'Uploading...'}
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: '#10b98120' }}
            >
              <Check className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
              Photo Uploaded!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-center mb-2">
              {isOnline
                ? `Added to "${selectedTask?.title}"`
                : 'Queued for upload when online'
              }
            </p>

            <div className="w-full max-w-xs space-y-3 mt-6">
              <button
                onClick={resetUpload}
                className="w-full py-4 rounded-xl text-white font-semibold text-lg active:scale-[0.98] transition-transform"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                Take Another Photo
              </button>
              <button
                onClick={() => router.push(`/tasks/${selectedTaskId}`)}
                className="w-full py-4 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-lg border border-zinc-200 dark:border-zinc-700 active:scale-[0.98] transition-transform"
              >
                View Task
              </button>
            </div>
          </div>
        )}
      </main>

      <MobileBottomNavSpacer />
      <MobileBottomNav />
    </div>
  );
}
