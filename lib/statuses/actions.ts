'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Status } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateStatusInput {
  name: string;
  color: string;
  order: number;
  is_complete: boolean;
  is_default: boolean;
}

export interface UpdateStatusInput {
  name?: string;
  color?: string;
  order?: number;
  is_complete?: boolean;
  is_default?: boolean;
}

/**
 * Get all statuses ordered by order field
 */
export async function getStatuses(): Promise<Status[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .order('order');

  if (error) {
    console.error('Error fetching statuses:', error);
    return [];
  }

  return data as Status[] || [];
}

/**
 * Get a single status by ID
 */
export async function getStatus(id: string): Promise<Status | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('id', id)
    .single<Status>();

  if (error) {
    console.error('Error fetching status:', error);
    return null;
  }

  return data;
}

/**
 * Get the next order value for a new status
 */
export async function getNextStatusOrder(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('statuses')
    .select('order')
    .order('order', { ascending: false })
    .limit(1)
    .single<{ order: number }>();

  if (error || !data) {
    return 0;
  }

  return data.order + 1;
}

/**
 * Create a new status
 */
export async function createStatus(
  status: CreateStatusInput
): Promise<ActionResult<Status>> {
  const supabase = await createClient();

  // If this status is set as default, unset other defaults first
  if (status.is_default) {
    await supabase
      .from('statuses')
      .update({ is_default: false } as never)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('statuses')
    .insert({
      name: status.name,
      color: status.color,
      order: status.order,
      is_complete: status.is_complete,
      is_default: status.is_default,
    } as never)
    .select()
    .single<Status>();

  if (error) {
    console.error('Error creating status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/statuses');
  return { success: true, data };
}

/**
 * Update an existing status
 */
export async function updateStatus(
  id: string,
  status: UpdateStatusInput
): Promise<ActionResult<Status>> {
  const supabase = await createClient();

  // If this status is being set as default, unset other defaults first
  if (status.is_default === true) {
    await supabase
      .from('statuses')
      .update({ is_default: false } as never)
      .neq('id', id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('statuses')
    .update({
      name: status.name,
      color: status.color,
      order: status.order,
      is_complete: status.is_complete,
      is_default: status.is_default,
    } as never)
    .eq('id', id)
    .select()
    .single<Status>();

  if (error) {
    console.error('Error updating status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/statuses');
  return { success: true, data };
}

/**
 * Delete a status
 */
export async function deleteStatus(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/statuses');
  return { success: true };
}

/**
 * Reorder statuses by updating their order values
 */
export async function reorderStatuses(
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // Update each status with its new order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('statuses')
      .update({ order: index } as never)
      .eq('id', id)
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find(r => r.error);
  if (failedUpdate?.error) {
    console.error('Error reordering statuses:', failedUpdate.error);
    return { success: false, error: failedUpdate.error.message };
  }

  revalidatePath('/admin/statuses');
  return { success: true };
}
