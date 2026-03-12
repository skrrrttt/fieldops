import type { CalendarTask } from '@/lib/calendar/actions';

export type CalendarView = 'month' | 'week' | 'day';

/** Get the start of the month grid (may include days from prev month) */
export function getMonthGridStart(year: number, month: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0=Sun
  const start = new Date(firstDay);
  start.setDate(start.getDate() - dayOfWeek);
  return start;
}

/** Get 42 days (6 weeks) for a month grid */
export function getMonthGridDays(year: number, month: number): Date[] {
  const start = getMonthGridStart(year, month);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Get 7 days for a week view starting from Sunday */
export function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Format date as YYYY-MM-DD */
export function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Check if two dates are the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Get tasks that overlap a specific day */
export function getTasksForDay(tasks: CalendarTask[], date: Date): CalendarTask[] {
  const dayStr = toDateStr(date);
  return tasks.filter(task => {
    const start = task.start_date.split('T')[0];
    const end = (task.end_date || task.start_date).split('T')[0];
    return dayStr >= start && dayStr <= end;
  });
}

/** Get the date range string for the visible range */
export function getDateRangeForView(
  view: CalendarView,
  date: Date
): { start: string; end: string } {
  if (view === 'month') {
    const days = getMonthGridDays(date.getFullYear(), date.getMonth());
    return { start: toDateStr(days[0]), end: toDateStr(days[41]) };
  }
  if (view === 'week') {
    const days = getWeekDays(date);
    return { start: toDateStr(days[0]), end: toDateStr(days[6]) };
  }
  // day
  return { start: toDateStr(date), end: toDateStr(date) };
}

/** Navigate to previous period */
export function navigatePrev(view: CalendarView, date: Date): Date {
  const d = new Date(date);
  if (view === 'month') d.setMonth(d.getMonth() - 1);
  else if (view === 'week') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 1);
  return d;
}

/** Navigate to next period */
export function navigateNext(view: CalendarView, date: Date): Date {
  const d = new Date(date);
  if (view === 'month') d.setMonth(d.getMonth() + 1);
  else if (view === 'week') d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  return d;
}

/** Format header label */
export function getHeaderLabel(view: CalendarView, date: Date): string {
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const days = getWeekDays(date);
    const start = days[0];
    const end = days[6];
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Calculate day diff between two date strings */
export function dayDiff(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00');
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

/** Add days to a date string, return new YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}
