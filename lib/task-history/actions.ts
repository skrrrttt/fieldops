'use server';

import { createClient } from '@/lib/supabase/server';
import type { TaskHistory } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TaskHistoryQueryParams {
  page?: number;
  pageSize?: number;
  templateId?: string;
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
    templateId,
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
  if (templateId) {
    query = query.eq('template_id', templateId);
  }
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
 * Get task history for a specific template (recurring task stats)
 */
export async function getTemplateHistory(
  templateId: string,
  limit: number = 50
): Promise<ActionResult<TaskHistory[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('template_id', templateId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching template history:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true, data: (data as TaskHistory[]) || [] };
}

/**
 * Get statistics for task history
 */
export async function getTaskHistoryStats(
  templateId?: string
): Promise<ActionResult<TaskHistoryStats>> {
  const supabase = await createClient();

  // Base query with optional template filter
  let baseQuery = supabase.from('task_history').select('*');
  if (templateId) {
    baseQuery = baseQuery.eq('template_id', templateId);
  }

  const { data: allHistory, error } = await baseQuery;

  if (error) {
    console.error('Error fetching task history stats:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  const history = (allHistory as TaskHistory[]) || [];

  // Calculate stats
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalCompleted = history.length;

  const validDurations = history
    .filter((h) => h.duration_minutes !== null)
    .map((h) => h.duration_minutes as number);
  const avgDurationMinutes =
    validDurations.length > 0
      ? Math.round(
          validDurations.reduce((a, b) => a + b, 0) / validDurations.length
        )
      : 0;

  const completedThisWeek = history.filter(
    (h) => new Date(h.completed_at) >= startOfWeek
  ).length;

  const completedThisMonth = history.filter(
    (h) => new Date(h.completed_at) >= startOfMonth
  ).length;

  // Group by division
  const divisionCounts = history.reduce(
    (acc, h) => {
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
      totalCompleted,
      avgDurationMinutes,
      completedThisWeek,
      completedThisMonth,
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
