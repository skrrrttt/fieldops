import { Skeleton } from '@/components/ui/skeleton';

export default function TaskDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-24">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Task header */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Details section */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>

        {/* Photos section */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <Skeleton className="h-5 w-16 mb-4" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="aspect-square rounded" />
            <Skeleton className="aspect-square rounded" />
            <Skeleton className="aspect-square rounded" />
          </div>
        </div>

        {/* Comments section */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
