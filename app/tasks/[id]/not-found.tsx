import Link from 'next/link';

export default function TaskNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Task not found
        </h2>
        <p className="text-muted-foreground mb-6">
          This task doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/tasks"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
