'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCalendarTasks, type CalendarTask } from '@/lib/calendar/actions';
import { updateTask } from '@/lib/tasks/actions';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { DayView } from './day-view';
import { CalendarHeader } from './calendar-header';
import {
  type CalendarView as ViewType,
  getDateRangeForView,
  toDateStr,
  dayDiff,
  addDays,
} from './calendar-helpers';
import { toast } from 'sonner';

interface CalendarViewProps {
  isAdmin: boolean;
  basePath: string; // '/admin/calendar' or '/calendar'
}

export function CalendarView({ isAdmin, basePath }: CalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse URL state
  const initialView = (searchParams.get('view') as ViewType) || 'month';
  const initialDate = searchParams.get('date') || toDateStr(new Date());

  const [view, setView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState(() => new Date(initialDate + 'T00:00:00'));
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // Update URL when view/date changes
  const updateUrl = useCallback((v: ViewType, d: Date) => {
    const params = new URLSearchParams();
    params.set('view', v);
    params.set('date', toDateStr(d));
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }, [router, basePath]);

  // Fetch tasks for the current view range
  const fetchTasks = useCallback(async (v: ViewType, d: Date) => {
    const { start, end } = getDateRangeForView(v, d);
    setLoading(true);
    const data = await getCalendarTasks(start, end);
    setTasks(data);
    setLoading(false);
  }, []);

  // Load tasks when view/date changes
  useEffect(() => {
    fetchTasks(view, currentDate);
  }, [view, currentDate, fetchTasks]);

  // Handle view change
  const handleViewChange = useCallback((v: ViewType) => {
    setView(v);
    updateUrl(v, currentDate);
  }, [currentDate, updateUrl]);

  // Handle date change
  const handleDateChange = useCallback((d: Date) => {
    setCurrentDate(d);
    updateUrl(view, d);
  }, [view, updateUrl]);

  // Handle click on a day (navigate to day view or create task)
  const handleDayClick = useCallback((date: Date) => {
    if (view !== 'day') {
      setView('day');
      setCurrentDate(date);
      updateUrl('day', date);
    }
  }, [view, updateUrl]);

  // Handle creating task from a date click
  const handleCreateFromDate = useCallback((dateStr: string) => {
    // Navigate to tasks page with create action and pre-filled date
    const taskPath = isAdmin ? '/admin/tasks' : '/tasks';
    router.push(`${taskPath}?action=create&start_date=${dateStr}`);
  }, [isAdmin, router]);

  // Handle drag-and-drop reschedule (admin only)
  const handleTaskDrop = useCallback(async (taskId: string, newDateStr: string) => {
    if (!isAdmin) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldStart = task.start_date.split('T')[0];
    const delta = dayDiff(oldStart, newDateStr);
    if (delta === 0) return;

    const newStart = newDateStr;
    const newEnd = task.end_date ? addDays(task.end_date.split('T')[0], delta) : null;

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, start_date: newStart, end_date: newEnd }
        : t
    ));

    startTransition(async () => {
      const result = await updateTask({
        id: taskId,
        start_date: newStart,
        end_date: newEnd,
      });

      if (result.success) {
        toast.success('Task rescheduled');
      } else {
        toast.error('Failed to reschedule');
        // Revert
        fetchTasks(view, currentDate);
      }
    });
  }, [isAdmin, tasks, view, currentDate, fetchTasks]);

  // Filter completed tasks
  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter(t => !t.status?.is_complete);

  return (
    <div className="space-y-4">
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
        showCompleted={showCompleted}
        onToggleCompleted={() => setShowCompleted(v => !v)}
        loading={loading || isPending}
      />

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {view === 'month' && (
          <MonthView
            tasks={visibleTasks}
            currentDate={currentDate}
            isAdmin={isAdmin}
            onDayClick={handleDayClick}
            onCreateTask={handleCreateFromDate}
            onTaskDrop={handleTaskDrop}
          />
        )}
        {view === 'week' && (
          <WeekView
            tasks={visibleTasks}
            currentDate={currentDate}
            isAdmin={isAdmin}
            onDayClick={handleDayClick}
            onCreateTask={handleCreateFromDate}
            onTaskDrop={handleTaskDrop}
          />
        )}
        {view === 'day' && (
          <DayView
            tasks={visibleTasks}
            currentDate={currentDate}
            isAdmin={isAdmin}
            onCreateTask={handleCreateFromDate}
          />
        )}
      </div>
    </div>
  );
}
