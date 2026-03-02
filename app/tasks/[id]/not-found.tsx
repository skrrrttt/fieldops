import Link from 'next/link';

export default function TaskNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
          Task not found
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          This task doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/tasks"
          className="inline-block px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
