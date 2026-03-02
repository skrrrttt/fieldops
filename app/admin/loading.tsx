export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-80 bg-zinc-200 dark:bg-zinc-700 rounded mt-2" />
      </div>
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    </div>
  );
}
