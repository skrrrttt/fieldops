export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-lg skeleton-shimmer" />
          <div className="h-10 w-24 rounded-lg skeleton-shimmer" />
          <div className="h-10 w-24 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl skeleton-shimmer" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="h-72 rounded-xl skeleton-shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl skeleton-shimmer" />
        <div className="h-64 rounded-xl skeleton-shimmer" />
      </div>
      <div className="h-72 rounded-xl skeleton-shimmer" />
    </div>
  );
}
