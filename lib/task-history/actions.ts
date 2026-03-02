'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/actions';
import type { TaskHistory } from '@/lib/database.types';
import type { ActionResult } from '@/lib/types';

export interface TaskHistoryQueryParams {
  page?: number;
  pageSize?: number;
  divisionName?: string;
  assignedUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'completed_at' | 'title' | 'duration_minutes';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskHistoryResult {
  data: TaskHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskHistoryStats {
  totalCompleted: number;
  avgDurationMinutes: number;
  completedThisWeek: number;
  completedThisMonth: number;
  byDivision: { name: string; count: number; color: string | null }[];
}

/**
 * Get paginated task history with filtering
 */
export async function getTaskHistory(
  params: TaskHistoryQueryParams = {}
): Promise<ActionResult<TaskHistoryResult>> {
  const supabase = await createClient();

  const {
    page = 1,
    pageSize = 25,
    divisionName,
    assignedUserId,
    dateFrom,
    dateTo,
    search,
    sortBy = 'completed_at',
    sortOrder = 'desc',
  } = params;

  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('task_history')
    .select('*', { count: 'exact' });

  // Apply filters
  if (divisionName) {
    query = query.eq('division_name', divisionName);
  }
  if (assignedUserId) {
    query = query.eq('assigned_user_id', assignedUserId);
  }
  if (dateFrom) {
    query = query.gte('completed_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('completed_at', dateTo);
  }
  if (search) {
    // Escape special LIKE pattern characters to prevent pattern injection
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    query = query.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
  }

  // Apply sorting and pagination
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching task history:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  const total = count || 0;

  return {
    success: true,
    data: {
      data: (data as TaskHistory[]) || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get a single task history record by ID
 */
export async function getTaskHistoryById(
  id: string
): Promise<ActionResult<TaskHistory>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching task history record:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true, data: data as TaskHistory };
}

/**
 * Get statistics for task history
 */
export async function getTaskHistoryStats(): Promise<ActionResult<TaskHistoryStats>> {
  const supabase = await createClient();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all queries concurrently instead of fetching all rows
  const [totalResult, weekResult, monthResult, divisionsResult, durationResult] = await Promise.all([
    // Total count
    supabase
      .from('task_history')
      .select('id', { count: 'exact', head: true }),
    // This week count
    supabase
      .from('task_history')
      .select('id', { count: 'exact', head: true })
      .gte('completed_at', startOfWeek.toISOString()),
    // This month count
    supabase
      .from('task_history')
      .select('id', { count: 'exact', head: true })
      .gte('completed_at', startOfMonth.toISOString()),
    // By division - fetch only needed columns
    supabase
      .from('task_history')
      .select('division_name, division_color'),
    // Duration - fetch only duration column
    supabase
      .from('task_history')
      .select('duration_minutes')
      .not('duration_minutes', 'is', null),
  ]);

  if (totalResult.error) {
    console.error('Error fetching task history stats:', totalResult.error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  // Calculate avg duration from minimal data
  const durations = (durationResult.data || []) as { duration_minutes: number }[];
  const avgDurationMinutes =
    durations.length > 0
      ? Math.round(
          durations.reduce((a, b) => a + b.duration_minutes, 0) / durations.length
        )
      : 0;

  // Group by division from minimal data
  const divisionCounts = (divisionsResult.data || []).reduce(
    (acc, h: { division_name: string | null; division_color: string | null }) => {
      const key = h.division_name || 'Unassigned';
      if (!acc[key]) {
        acc[key] = { count: 0, color: h.division_color };
      }
      acc[key].count++;
      return acc;
    },
    {} as Record<string, { count: number; color: string | null }>
  );

  const byDivision = Object.entries(divisionCounts)
    .map(([name, { count, color }]) => ({ name, count, color }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    data: {
      totalCompleted: totalResult.count || 0,
      avgDurationMinutes,
      completedThisWeek: weekResult.count || 0,
      completedThisMonth: monthResult.count || 0,
      byDivision,
    },
  };
}

/**
 * Get unique division names from history (for filter dropdowns)
 */
export async function getHistoryDivisions(): Promise<ActionResult<string[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_history')
    .select('division_name')
    .not('division_name', 'is', null);

  if (error) {
    console.error('Error fetching history divisions:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  const records = data as { division_name: string | null }[] | null;
  const uniqueDivisions = [...new Set(records?.map((d) => d.division_name).filter(Boolean) as string[] || [])];
  return { success: true, data: uniqueDivisions };
}

/**
 * Delete a task history record (admin only)
 */
export async function deleteTaskHistory(
  id: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('task_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task history:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true };
}

/**
 * Bulk delete old task history records (admin cleanup)
 */
export async function cleanupOldHistory(
  olderThanDays: number = 365
): Promise<ActionResult<number>> {
  await requireAdmin();
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('task_history')
    .delete()
    .lt('completed_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up old history:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true, data: data?.length || 0 };
}

/**
 * Restore a task from history (creates a new task with the same data)
 */
export async function restoreTaskFromHistory(
  historyId: string
): Promise<ActionResult<{ taskId: string }>> {
  const supabase = await createClient();

  // Get the history record
  const { data: historyData, error: fetchError } = await supabase
    .from('task_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (fetchError || !historyData) {
    return { success: false, error: fetchError?.message || 'History record not found' };
  }

  const history = historyData as TaskHistory;

  // Get the default status
  const { data: statusData } = await supabase
    .from('statuses')
    .select('id')
    .eq('is_default', true)
    .single();

  const defaultStatus = statusData as { id: string } | null;

  if (!defaultStatus) {
    return { success: false, error: 'No default status found' };
  }

  // Find division by name if it exists
  let divisionId: string | null = null;
  if (history.division_name) {
    const { data: divisionData } = await supabase
      .from('divisions')
      .select('id')
      .eq('name', history.division_name)
      .single();
    const division = divisionData as { id: string } | null;
    divisionId = division?.id || null;
  }

  // Create a new task from the history
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert({
      title: history.title,
      description: history.description,
      specifications: history.specifications,
      status_id: defaultStatus.id,
      division_id: divisionId,
      address: history.address,
      location_lat: history.location_lat,
      location_lng: history.location_lng,
      custom_fields: history.custom_fields,
      assigned_user_id: history.assigned_user_id,
    } as never)
    .select('id')
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  const task = newTask as { id: string };
  return { success: true, data: { taskId: task.id } };
}
