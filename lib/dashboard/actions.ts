'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/actions';
import type { Status } from '@/lib/database.types';

export interface TaskCountByStatus {
  status_id: string;
  status_name: string;
  status_color: string;
  count: number;
  is_complete: boolean;
}

export interface RecentUpload {
  id: string;
  storage_path: string;
  created_at: string;
  task_id: string;
  task_title: string;
  user_email: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByStatus: TaskCountByStatus[];
  recentUploads: RecentUpload[];
  totalUsers: number;
  activeUsersToday: number;
}

/**
 * Get task counts grouped by status
 * Optimized: Single query for statuses + single query for task status_ids, counted in JS
 */
export async function getTaskCountsByStatus(): Promise<TaskCountByStatus[]> {
  const supabase = await createClient();

  // Fire both queries concurrently (2 queries instead of N+1)
  const statusPromise = supabase
    .from('statuses')
    .select('id, name, color, is_complete')
    .order('order');
  const taskPromise = supabase
    .from('tasks')
    .select('status_id')
    .is('deleted_at', null)
    .returns<{ status_id: string }[]>();

  const statusResult = await statusPromise;
  const taskResult = await taskPromise;

  if (statusResult.error || !statusResult.data) {
    console.error('Error fetching statuses:', statusResult.error);
    return [];
  }

  // Count tasks per status in JS
  const countMap = new Map<string, number>();
  if (taskResult.data) {
    for (const task of taskResult.data) {
      countMap.set(task.status_id, (countMap.get(task.status_id) || 0) + 1);
    }
  }

  return (statusResult.data as Status[]).map((status) => ({
    status_id: status.id,
    status_name: status.name,
    status_color: status.color,
    count: countMap.get(status.id) || 0,
    is_complete: status.is_complete,
  }));
}

/**
 * Get recent photo uploads with task and user info
 */
export async function getRecentUploads(limit: number = 8): Promise<RecentUpload[]> {
  const supabase = await createClient();

  // Define type for the query result
  interface PhotoWithRelations {
    id: string;
    storage_path: string;
    created_at: string;
    task_id: string;
    task: { title: string } | null;
    user: { email: string } | null;
  }

  const { data, error } = await supabase
    .from('photos')
    .select(`
      id,
      storage_path,
      created_at,
      task_id,
      task:tasks!inner(title),
      user:users(email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent uploads:', error);
    return [];
  }

  return (data as PhotoWithRelations[] || []).map(photo => ({
    id: photo.id,
    storage_path: photo.storage_path,
    created_at: photo.created_at,
    task_id: photo.task_id,
    task_title: photo.task?.title || 'Unknown Task',
    user_email: photo.user?.email || 'Unknown User',
  }));
}

/**
 * Get overall task statistics
 * Optimized: Fetches minimal task data in one query, computes stats in JS
 */
export async function getTaskStats(): Promise<{
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}> {
  const supabase = await createClient();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];

  // Fire both queries concurrently
  const statusPromise = supabase
    .from('statuses')
    .select('id')
    .eq('is_complete', true);
  const tasksPromise = supabase
    .from('tasks')
    .select('status_id, end_date')
    .is('deleted_at', null)
    .returns<{ status_id: string; end_date: string | null }[]>();

  const completeStatusResult = await statusPromise;
  const tasksResult = await tasksPromise;

  const completeStatusIds = new Set(
    (completeStatusResult.data || []).map((s: { id: string }) => s.id)
  );
  const tasks = tasksResult.data || [];

  let completed = 0;
  let overdue = 0;

  for (const task of tasks) {
    const isComplete = completeStatusIds.has(task.status_id);
    if (isComplete) {
      completed++;
    } else if (task.end_date && task.end_date < todayStr) {
      overdue++;
    }
  }

  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    overdue,
  };
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  total: number;
  activeToday: number;
}> {
  const supabase = await createClient();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fire both count queries concurrently
  const [totalResult, activeResult] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_active_at', twentyFourHoursAgo),
  ]);

  if (totalResult.error) {
    console.error('Error fetching users:', totalResult.error);
    return { total: 0, activeToday: 0 };
  }

  return {
    total: totalResult.count || 0,
    activeToday: activeResult.count || 0,
  };
}

/**
 * Get full dashboard stats in a single call
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();
  const [tasksByStatus, recentUploads, taskStats, userStats] = await Promise.all([
    getTaskCountsByStatus(),
    getRecentUploads(),
    getTaskStats(),
    getUserStats(),
  ]);

  return {
    totalTasks: taskStats.total,
    completedTasks: taskStats.completed,
    pendingTasks: taskStats.pending,
    overdueTasks: taskStats.overdue,
    tasksByStatus,
    recentUploads,
    totalUsers: userStats.total,
    activeUsersToday: userStats.activeToday,
  };
}
