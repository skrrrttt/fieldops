'use server';

import { createClient } from '@/lib/supabase/server';
import type { Status, Photo, Task, User, Division } from '@/lib/database.types';

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
 * Optimized: Uses parallel count queries instead of fetching all tasks
 */
export async function getTaskCountsByStatus(): Promise<TaskCountByStatus[]> {
  const supabase = await createClient();

  // Get all statuses first
  const { data: statuses, error: statusError } = await supabase
    .from('statuses')
    .select('id, name, color, is_complete')
    .order('order');

  if (statusError || !statuses) {
    console.error('Error fetching statuses:', statusError);
    return [];
  }

  // Get counts for each status in parallel using count queries
  // This is much more efficient than fetching all tasks
  const countPromises = (statuses as Status[]).map(async (status) => {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status_id', status.id)
      .is('deleted_at', null);

    if (error) {
      console.error(`Error counting tasks for status ${status.id}:`, error);
      return 0;
    }
    return count || 0;
  });

  const counts = await Promise.all(countPromises);

  return (statuses as Status[]).map((status, index) => ({
    status_id: status.id,
    status_name: status.name,
    status_color: status.color,
    count: counts[index],
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
 * Optimized: Uses parallel count queries instead of fetching all tasks
 */
export async function getTaskStats(): Promise<{
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}> {
  const supabase = await createClient();

  // Get complete status IDs first
  const { data: completeStatuses } = await supabase
    .from('statuses')
    .select('id')
    .eq('is_complete', true);

  const completeStatusIds = (completeStatuses || []).map((s: { id: string }) => s.id);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];

  // Run all count queries in parallel
  const [totalResult, completedResult, overdueResult] = await Promise.all([
    // Total non-deleted tasks
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),

    // Completed tasks (status.is_complete = true)
    completeStatusIds.length > 0
      ? supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('status_id', completeStatusIds)
      : Promise.resolve({ count: 0, error: null }),

    // Overdue tasks (due_date < today AND not complete)
    completeStatusIds.length > 0
      ? supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .lt('due_date', todayStr)
          .not('status_id', 'in', `(${completeStatusIds.join(',')})`)
      : supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .lt('due_date', todayStr),
  ]);

  const total = totalResult.count || 0;
  const completed = completedResult.count || 0;
  const pending = total - completed;
  const overdue = overdueResult.count || 0;

  return { total, completed, pending, overdue };
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  total: number;
  activeToday: number;
}> {
  const supabase = await createClient();

  // Get total users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, last_active_at, is_active')
    .eq('is_active', true);

  if (error || !users) {
    console.error('Error fetching users:', error);
    return { total: 0, activeToday: 0 };
  }

  // Count users active in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  interface UserWithActivity {
    id: string;
    last_active_at: string | null;
    is_active: boolean;
  }

  const activeToday = (users as UserWithActivity[]).filter(
    user => user.last_active_at && user.last_active_at > twentyFourHoursAgo
  ).length;

  return {
    total: users.length,
    activeToday,
  };
}

/**
 * Get full dashboard stats in a single call
 */
export async function getDashboardStats(): Promise<DashboardStats> {
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
