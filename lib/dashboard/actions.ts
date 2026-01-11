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

  // Get task counts per status
  interface TaskStatus {
    status_id: string | null;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('status_id')
    .is('deleted_at', null);

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    return [];
  }

  // Count tasks per status
  const countMap = new Map<string, number>();
  (tasks as TaskStatus[] || []).forEach(task => {
    const statusId = task.status_id;
    if (statusId) {
      countMap.set(statusId, (countMap.get(statusId) || 0) + 1);
    }
  });

  return (statuses as Status[]).map(status => ({
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
 */
export async function getTaskStats(): Promise<{
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}> {
  const supabase = await createClient();

  // Get all non-deleted tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id,
      status_id,
      due_date,
      status:statuses(is_complete)
    `)
    .is('deleted_at', null);

  if (error || !tasks) {
    console.error('Error fetching tasks:', error);
    return { total: 0, completed: 0, pending: 0, overdue: 0 };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let completed = 0;
  let pending = 0;
  let overdue = 0;

  // Define type for task with status
  interface TaskWithStatus {
    id: string;
    status_id: string | null;
    due_date: string | null;
    status: { is_complete: boolean } | null;
  }

  (tasks as TaskWithStatus[]).forEach(task => {
    const isComplete = task.status?.is_complete || false;

    if (isComplete) {
      completed++;
    } else {
      pending++;
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (dueDate < now) {
          overdue++;
        }
      }
    }
  });

  return {
    total: tasks.length,
    completed,
    pending,
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
