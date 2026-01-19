'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createComment, type CommentWithUser } from '@/lib/comments/actions';
import { useOnlineStatus, queueCommentMutation, saveToLocal, type LocalComment } from '@/lib/offline';

// TypeScript types for Web Speech API (not included in standard lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Declare global window properties for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface CommentInputProps {
  taskId: string;
  onCommentAdded: (comment: CommentWithUser) => void;
}

export function CommentInput({ taskId, onCommentAdded }: CommentInputProps) {
  const isOnline = useOnlineStatus();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if Speech Recognition API is available
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  // Toast notification helper - defined early so other hooks can use it
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return recognition;
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    const recognition = initSpeechRecognition();
    if (!recognition) {
      showToast('error', 'Speech recognition not supported');
      return;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      // Append transcript to existing content
      setContent((prev) => {
        // If there's existing content and it doesn't end with a space, add one
        if (prev && !prev.endsWith(' ') && transcript) {
          return prev + ' ' + transcript;
        }
        return prev + transcript;
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);

      if (event.error === 'no-speech') {
        showToast('error', 'No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        showToast('error', 'Microphone access denied. Please allow microphone permissions.');
      } else if (event.error !== 'aborted') {
        showToast('error', 'Speech recognition error. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch {
      showToast('error', 'Failed to start speech recognition');
      setIsRecording(false);
    }
  }, [initSpeechRecognition, showToast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stop recording if active when submitting
    if (isRecording) {
      stopRecording();
    }

    if (!content.trim()) {
      showToast('error', 'Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    const commentContent = content.trim();

    // If offline, queue the mutation
    if (!isOnline) {
      try {
        const tempId = `temp_comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Queue the mutation for later sync
        await queueCommentMutation({
          task_id: taskId,
          content: commentContent,
          temp_id: tempId,
        });

        // Create a temporary local comment for optimistic UI
        const localComment: LocalComment = {
          id: tempId,
          task_id: taskId,
          user_id: 'offline_user', // Placeholder, will be set on sync
          content: commentContent,
          created_at: new Date().toISOString(),
          user: { id: 'offline_user', email: 'You (pending sync)', display_name: null, avatar_url: null },
        };

        // Save to local cache
        await saveToLocal('comments', localComment);

        setContent('');
        showToast('info', 'Comment queued (will sync when online)');

        // Create a temporary CommentWithUser for the UI
        const tempComment: CommentWithUser = {
          id: tempId,
          task_id: taskId,
          user_id: 'offline_user',
          content: commentContent,
          created_at: new Date().toISOString(),
          user: { id: 'offline_user', email: 'You (pending sync)', display_name: null, avatar_url: null },
        };
        onCommentAdded(tempComment);
      } catch {
        showToast('error', 'Failed to queue comment');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Online: send to server immediately
    try {
      const result = await createComment({
        task_id: taskId,
        content: commentContent,
      });

      if (result.success && result.data) {
        setContent('');
        showToast('success', 'Comment added successfully');
        onCommentAdded(result.data);
      } else {
        showToast('error', result.error || 'Failed to add comment');
      }
    } catch {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Add Comment
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Textarea with microphone button container */}
        <div className="relative">
          {/* Large text input - min height 64px for touch-friendly keyboard input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Write your comment here..."}
            rows={3}
            className={`w-full min-h-[64px] p-3 ${speechSupported ? 'pr-14' : ''} text-base text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 border rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${
              isRecording
                ? 'border-red-500 dark:border-red-500'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}
            disabled={isSubmitting}
          />

          {/* Microphone button - only shown if speech recognition is supported */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isSubmitting}
              className={`absolute right-2 top-2 p-2 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                // Stop/recording icon
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                // Microphone icon
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            Recording... Tap the microphone to stop
          </div>
        )}

        {/* Submit button - large touch target */}
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center justify-center gap-2 w-full min-h-[48px] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
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
              Submitting...
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Post Comment
            </>
          )}
        </button>
      </form>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 ${
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-red-600'
          }`}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : toast.type === 'info' ? (
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
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
            )}
            {toast.message}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </section>
  );
}
