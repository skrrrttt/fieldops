'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/actions';
import type { Status, Division, User } from '@/lib/database.types';

export interface CalendarTask {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: Pick<Status, 'name' | 'color' | 'is_complete'> | null;
  division: Pick<Division, 'name' | 'color'> | null;
  assigned_user: Pick<User, 'id' | 'email'> | null;
}

export interface CalendarDayCounts {
  [date: string]: number; // YYYY-MM-DD -> task count
}

/**
 * Get tasks for a calendar date range
 */
export async function getCalendarTasks(
  rangeStart: string,
  rangeEnd: string
): Promise<CalendarTask[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from('tasks')
    .select(`
      id, title, start_date, end_date,
      status:statuses(name, color, is_complete),
      division:divisions(name, color),
      assigned_user:users!tasks_assigned_user_id_fkey(id, email)
    `)
    .is('deleted_at', null)
    .not('start_date', 'is', null);

  // Date range overlap: task visible if it starts before range ends AND ends after range starts
  query = query.lte('start_date', rangeEnd);
  // For tasks with end_date, check overlap. For tasks without, just check start_date is in range.
  // We fetch broadly and filter in JS for the OR condition

  // Scope: field users see only their own tasks by default
  if (user.role !== 'admin') {
    query = query.eq('assigned_user_id', user.id);
  }

  const { data, error } = await query.order('start_date');

  if (error) {
    console.error('Error fetching calendar tasks:', error);
    return [];
  }

  // Filter: task must overlap with the range
  return ((data || []) as unknown as CalendarTask[]).filter(task => {
    const taskEnd = task.end_date || task.start_date;
    return taskEnd >= rangeStart;
  });
}

/**
 * Get task counts per day for mini-calendar widget
 */
export async function getCalendarDayCounts(
  rangeStart: string,
  rangeEnd: string
): Promise<CalendarDayCounts> {
  const tasks = await getCalendarTasks(rangeStart, rangeEnd);
  const counts: CalendarDayCounts = {};

  for (const task of tasks) {
    const start = task.start_date.split('T')[0];
    const end = (task.end_date || task.start_date).split('T')[0];

    // Count each day the task spans
    const current = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const rangeEndDate = new Date(rangeEnd + 'T00:00:00');

    while (current <= endDate && current <= rangeEndDate) {
      const key = current.toISOString().split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
      current.setDate(current.getDate() + 1);
    }
  }

  return counts;
}
