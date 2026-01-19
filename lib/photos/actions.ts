'use server';

import { createClient } from '@/lib/supabase/server';
import type { Photo, Division } from '@/lib/database.types';
import { getCurrentUser } from '@/lib/auth/actions';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PhotoWithUser extends Photo {
  user: { id: string; email: string } | null;
}

export interface PhotoWithTaskInfo extends Photo {
  user: { id: string; email: string } | null;
  task: {
    id: string;
    title: string;
    division_id: string | null;
    division: Division | null;
  } | null;
}

export interface PhotosQueryParams {
  taskId?: string;
  userId?: string;
  divisionId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Get all photos across all tasks with optional filters
 */
export async function getAllPhotos(
  params: PhotosQueryParams = {}
): Promise<PhotoWithTaskInfo[]> {
  const supabase = await createClient();

  const { taskId, userId, divisionId, startDate, endDate } = params;

  let query = supabase
    .from('photos')
    .select(`
      *,
      user:users(id, email),
      task:tasks!inner(
        id,
        title,
        division_id,
        division:divisions(*)
      )
    `)
    .is('task.deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply filters
  if (taskId) {
    query = query.eq('task_id', taskId);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (divisionId) {
    query = query.eq('task.division_id', divisionId);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    // Add one day to include the entire end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    query = query.lt('created_at', endDateTime.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all photos:', error);
    return [];
  }

  return (data as PhotoWithTaskInfo[]) || [];
}

interface PhotoWithTask {
  task: { id: string; title: string };
}

/**
 * Get unique tasks that have photos
 */
export async function getTasksWithPhotos(): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('photos')
    .select(`
      task:tasks!inner(id, title)
    `)
    .is('task.deleted_at', null);

  if (error) {
    console.error('Error fetching tasks with photos:', error);
    return [];
  }

  // Extract unique tasks
  const taskMap = new Map<string, { id: string; title: string }>();
  const photos = (data || []) as PhotoWithTask[];
  for (const photo of photos) {
    const task = photo.task;
    if (task && !taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  }

  return Array.from(taskMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

interface PhotoWithUserOnly {
  user: { id: string; email: string } | null;
}

/**
 * Get unique users who have uploaded photos
 */
export async function getUsersWithPhotos(): Promise<{ id: string; email: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('photos')
    .select(`
      user:users(id, email)
    `);

  if (error) {
    console.error('Error fetching users with photos:', error);
    return [];
  }

  // Extract unique users
  const userMap = new Map<string, { id: string; email: string }>();
  const photos = (data || []) as PhotoWithUserOnly[];
  for (const photo of photos) {
    const user = photo.user;
    if (user && !userMap.has(user.id)) {
      userMap.set(user.id, user);
    }
  }

  return Array.from(userMap.values()).sort((a, b) =>
    a.email.localeCompare(b.email)
  );
}

/**
 * Get all photos for a task
 */
export async function getTaskPhotos(taskId: string): Promise<PhotoWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('photos')
    .select(`
      *,
      user:users(id, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }

  return (data as PhotoWithUser[]) || [];
}

export interface CreatePhotoData {
  task_id: string;
  storage_path: string;
  timestamp: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
}

/**
 * Create a photo record in the database
 */
export async function createPhotoRecord(data: CreatePhotoData): Promise<ActionResult<Photo>> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: photo, error } = await supabase
    .from('photos')
    .insert({
      task_id: data.task_id,
      user_id: user.id,
      storage_path: data.storage_path,
      timestamp: data.timestamp,
      gps_lat: data.gps_lat || null,
      gps_lng: data.gps_lng || null,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating photo record:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true, data: photo as Photo };
}

/**
 * Delete a photo record and its storage file
 */
export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // First get the photo to find the storage path and verify ownership
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path, user_id')
    .eq('id', photoId)
    .single<{ storage_path: string; user_id: string }>();

  if (fetchError || !photo) {
    return { success: false, error: 'Photo not found' };
  }

  // Only allow deletion by the photo owner or admins
  if (photo.user_id !== user.id && user.role !== 'admin') {
    return { success: false, error: 'Not authorized to delete this photo' };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('photos')
    .remove([photo.storage_path]);

  if (storageError) {
    console.error('Error deleting photo from storage:', storageError);
    // Continue to delete record even if storage delete fails
  }

  // Delete the record
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    console.error('Error deleting photo record:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true };
}
