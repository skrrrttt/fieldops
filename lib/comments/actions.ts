'use server';

import { createClient } from '@/lib/supabase/server';
import type { Comment } from '@/lib/database.types';
import { getCurrentUser } from '@/lib/auth/actions';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CommentWithUser extends Comment {
  user: { id: string; email: string; display_name: string | null; avatar_url: string | null } | null;
}

/**
 * Get all comments for a task
 */
export async function getTaskComments(taskId: string): Promise<CommentWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(id, email, display_name, avatar_url)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return (data as CommentWithUser[]) || [];
}

export interface CreateCommentData {
  task_id: string;
  content: string;
}

/**
 * Create a comment on a task
 */
export async function createComment(data: CreateCommentData): Promise<ActionResult<CommentWithUser>> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!data.content.trim()) {
    return { success: false, error: 'Comment content is required' };
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      task_id: data.task_id,
      user_id: user.id,
      content: data.content.trim(),
    } as never)
    .select(`
      *,
      user:users(id, email, display_name, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: comment as CommentWithUser };
}

/**
 * Delete a comment (only allowed for the comment author or admin)
 */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if user owns this comment or is admin
  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .single<{ user_id: string }>();

  if (fetchError || !comment) {
    return { success: false, error: 'Comment not found' };
  }

  if (comment.user_id !== user.id && user.role !== 'admin') {
    return { success: false, error: 'Not authorized to delete this comment' };
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
