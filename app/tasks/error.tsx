'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function TasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: Report to Sentry when @sentry/nextjs error boundary is configured
    console.error('Tasks error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Failed to load tasks
        </h2>
        <p className="text-muted-foreground mb-6">
          There was a problem loading your tasks. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/tasks"
            className="px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
