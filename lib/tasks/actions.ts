'use server';

import { createClient } from '@/lib/supabase/server';
import type { Task, Division, Status, User } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TaskWithRelations extends Task {
  status: Status | null;
  division: Division | null;
  assigned_user: User | null;
}

export interface TasksQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  statusId?: string;
  divisionId?: string;
  assignedUserId?: string;
  search?: string;
}

export interface PaginatedTasksResult {
  tasks: TaskWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get paginated tasks with filters, sorting, and search
 */
export async function getTasks(
  params: TasksQueryParams = {}
): Promise<PaginatedTasksResult> {
  const supabase = await createClient();

  const {
    page = 1,
    pageSize = 25,
    sortBy = 'created_at',
    sortOrder = 'desc',
    statusId,
    divisionId,
    assignedUserId,
    search,
  } = params;

  const offset = (page - 1) * pageSize;

  // Build the query
  let query = supabase
    .from('tasks')
    .select(
      `
      *,
      status:statuses(*),
      division:divisions(*),
      assigned_user:users(*)
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  // Apply filters
  if (statusId) {
    query = query.eq('status_id', statusId);
  }
  if (divisionId) {
    query = query.eq('division_id', divisionId);
  }
  if (assignedUserId) {
    query = query.eq('assigned_user_id', assignedUserId);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortColumns = [
    'title',
    'created_at',
    'updated_at',
    'due_date',
  ];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return {
      tasks: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const tasks = (data as TaskWithRelations[]) || [];
  const total = count || 0;

  return {
    tasks,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single task by ID with relations
 */
export async function getTask(id: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      status:statuses(*),
      division:divisions(*),
      assigned_user:users(*)
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    return null;
  }

  return data as TaskWithRelations;
}

/**
 * Get all users for assignment dropdown
 */
export async function getUsers(): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('email');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data as User[]) || [];
}

/**
 * Get default status for new tasks
 */
export async function getDefaultStatus(): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statuses')
    .select('id')
    .eq('is_default', true)
    .single<{ id: string }>();

  if (error || !data) {
    // If no default, get the first status by order
    const { data: firstStatus } = await supabase
      .from('statuses')
      .select('id')
      .order('order', { ascending: true })
      .limit(1)
      .single<{ id: string }>();

    return firstStatus?.id || null;
  }

  return data.id;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  status_id: string;
  division_id?: string | null;
  assigned_user_id?: string | null;
  due_date?: string | null;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  custom_fields?: Record<string, unknown> | null;
  assigned_field_ids?: string[] | null;
}

/**
 * Create a new task
 */
export async function createTask(data: CreateTaskData): Promise<ActionResult<Task>> {
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: data.title,
      description: data.description || null,
      status_id: data.status_id,
      division_id: data.division_id || null,
      assigned_user_id: data.assigned_user_id || null,
      due_date: data.due_date || null,
      address: data.address || null,
      location_lat: data.location_lat || null,
      location_lng: data.location_lng || null,
      custom_fields: data.custom_fields || null,
      assigned_field_ids: data.assigned_field_ids || [],
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: task as Task };
}

export interface UpdateTaskData {
  id: string;
  title?: string;
  description?: string | null;
  status_id?: string;
  division_id?: string | null;
  assigned_user_id?: string | null;
  due_date?: string | null;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  custom_fields?: Record<string, unknown> | null;
  assigned_field_ids?: string[] | null;
}

/**
 * Update an existing task
 */
export async function updateTask(data: UpdateTaskData): Promise<ActionResult<Task>> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status_id !== undefined) updateData.status_id = data.status_id;
  if (data.division_id !== undefined) updateData.division_id = data.division_id;
  if (data.assigned_user_id !== undefined) updateData.assigned_user_id = data.assigned_user_id;
  if (data.due_date !== undefined) updateData.due_date = data.due_date;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.location_lat !== undefined) updateData.location_lat = data.location_lat;
  if (data.location_lng !== undefined) updateData.location_lng = data.location_lng;
  if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields;
  if (data.assigned_field_ids !== undefined) updateData.assigned_field_ids = data.assigned_field_ids;

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData as never)
    .eq('id', data.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: task as Task };
}

/**
 * Soft delete a task by setting deleted_at
 */
export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update a task's status (simplified action for field users)
 */
export async function updateTaskStatus(
  taskId: string,
  statusId: string
): Promise<ActionResult<Task>> {
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      status_id: statusId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: task as Task };
}

/**
 * Bulk assign tasks to a user
 */
export async function bulkAssignTasks(
  taskIds: string[],
  userId: string | null
): Promise<ActionResult<{ updated: number }>> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('tasks')
    .update({
      assigned_user_id: userId,
      updated_at: new Date().toISOString(),
    } as never)
    .in('id', taskIds)
    .is('deleted_at', null);

  if (error) {
    console.error('Error bulk assigning tasks:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { updated: count || taskIds.length } };
}

/**
 * Bulk change task status
 */
export async function bulkChangeStatus(
  taskIds: string[],
  statusId: string
): Promise<ActionResult<{ updated: number }>> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('tasks')
    .update({
      status_id: statusId,
      updated_at: new Date().toISOString(),
    } as never)
    .in('id', taskIds)
    .is('deleted_at', null);

  if (error) {
    console.error('Error bulk changing task status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { updated: count || taskIds.length } };
}

/**
 * Bulk delete tasks (soft delete)
 */
export async function bulkDeleteTasks(
  taskIds: string[]
): Promise<ActionResult<{ deleted: number }>> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .in('id', taskIds)
    .is('deleted_at', null);

  if (error) {
    console.error('Error bulk deleting tasks:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { deleted: count || taskIds.length } };
}

/**
 * Update a task's custom fields (for field users to fill in custom data)
 */
export async function updateTaskCustomFields(
  taskId: string,
  customFields: Record<string, unknown>
): Promise<ActionResult<Task>> {
  const supabase = await createClient();

  // First get the current task to merge custom fields
  const { data: currentTask, error: fetchError } = await supabase
    .from('tasks')
    .select('custom_fields')
    .eq('id', taskId)
    .single<{ custom_fields: Record<string, unknown> | null }>();

  if (fetchError) {
    console.error('Error fetching task:', fetchError);
    return { success: false, error: fetchError.message };
  }

  // Merge existing custom fields with new values
  const mergedCustomFields = {
    ...((currentTask?.custom_fields as Record<string, unknown>) || {}),
    ...customFields,
  };

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      custom_fields: mergedCustomFields,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task custom fields:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: task as Task };
}
