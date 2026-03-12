import { Suspense } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';

export default function AdminCalendarPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarView isAdmin={true} basePath="/admin/calendar" />
      </Suspense>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-secondary rounded-lg" />
        <div className="h-8 w-64 bg-secondary rounded-lg" />
      </div>
      <div className="bg-card rounded-2xl border border-border/50 h-[600px]" />
    </div>
  );
}
