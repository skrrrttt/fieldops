import { Suspense } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import { AppHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

export default function FieldCalendarPage() {
  return (
    <>
      <AppHeader subtitle="Calendar" />
      <main className="p-4 pb-6 max-w-[1200px] mx-auto">
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarView isAdmin={false} basePath="/calendar" />
        </Suspense>
      </main>
      <MobileBottomNavSpacer />
      <MobileBottomNav />
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-secondary rounded-lg" />
        <div className="h-8 w-64 bg-secondary rounded-lg" />
      </div>
      <div className="bg-card rounded-2xl border border-border/50 h-[500px]" />
    </div>
  );
}
