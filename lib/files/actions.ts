'use server';

import { createClient } from '@/lib/supabase/server';
import type { File as FileRecord } from '@/lib/database.types';
import { getCurrentUser } from '@/lib/auth/actions';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileWithUser extends FileRecord {
  user: { id: string; email: string } | null;
}

/**
 * Get all files for a task
 */
export async function getTaskFiles(taskId: string): Promise<FileWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('files')
    .select(`
      *,
      user:users(id, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    return [];
  }

  return (data as FileWithUser[]) || [];
}

export interface CreateFileData {
  task_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
}

/**
 * Create a file record in the database
 */
export async function createFileRecord(data: CreateFileData): Promise<ActionResult<FileRecord>> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: file, error } = await supabase
    .from('files')
    .insert({
      task_id: data.task_id,
      user_id: user.id,
      storage_path: data.storage_path,
      file_name: data.file_name,
      file_size: data.file_size,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating file record:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: file as FileRecord };
}

/**
 * Delete a file record and its storage file
 */
export async function deleteFile(fileId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // First get the file to find the storage path
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single<{ storage_path: string }>();

  if (fetchError || !file) {
    return { success: false, error: 'File not found' };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('files')
    .remove([file.storage_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    // Continue to delete record even if storage delete fails
  }

  // Delete the record
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (error) {
    console.error('Error deleting file record:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
