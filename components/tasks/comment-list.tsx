'use client';

import type { CommentWithUser } from '@/lib/comments/actions';

interface CommentListProps {
  comments: CommentWithUser[];
}

// Generate a consistent color based on user email/id for visual distinction
function getUserColor(userId: string): { bg: string; text: string } {
  // Use a hash of the user ID to pick a color
  const colors = [
    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
    { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  ];

  // Simple hash function to get consistent color per user
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function CommentList({ comments }: CommentListProps) {
  // Empty state when no comments exist
  if (comments.length === 0) {
    return (
      <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="text-center py-4">
          <svg
            className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="text-base font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            No comments yet
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Be the first to add a comment to this task.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Comments ({comments.length})
      </h2>
      <div className="space-y-4">
        {comments.map((comment) => {
          const userColor = getUserColor(comment.user?.id || comment.user_id);

          return (
            <div
              key={comment.id}
              className="flex gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 last:pb-0"
            >
              {/* User avatar with distinct color per user */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${userColor.bg} ${userColor.text}`}
              >
                {comment.user?.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {comment.user?.email || 'Unknown user'}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-base text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
