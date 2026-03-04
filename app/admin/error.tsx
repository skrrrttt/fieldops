'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: Report to Sentry when @sentry/nextjs error boundary is configured
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
          Failed to load admin panel
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          There was a problem loading the admin panel. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="px-6 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
