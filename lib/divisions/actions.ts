'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Division } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateDivisionInput {
  name: string;
  color: string;
  icon: string | null;
}

export interface UpdateDivisionInput {
  name?: string;
  color?: string;
  icon?: string | null;
}

/**
 * Get all divisions ordered by name
 */
export async function getDivisions(): Promise<Division[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching divisions:', error);
    return [];
  }

  return data as Division[] || [];
}

/**
 * Get a single division by ID
 */
export async function getDivision(id: string): Promise<Division | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('id', id)
    .single<Division>();

  if (error) {
    console.error('Error fetching division:', error);
    return null;
  }

  return data;
}

/**
 * Create a new division
 */
export async function createDivision(
  division: CreateDivisionInput
): Promise<ActionResult<Division>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .insert({
      name: division.name,
      color: division.color,
      icon: division.icon,
    } as never)
    .select()
    .single<Division>();

  if (error) {
    console.error('Error creating division:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/divisions');
  return { success: true, data };
}

/**
 * Update an existing division
 */
export async function updateDivision(
  id: string,
  division: UpdateDivisionInput
): Promise<ActionResult<Division>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .update({
      name: division.name,
      color: division.color,
      icon: division.icon,
    } as never)
    .eq('id', id)
    .select()
    .single<Division>();

  if (error) {
    console.error('Error updating division:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/divisions');
  return { success: true, data };
}

/**
 * Delete a division
 */
export async function deleteDivision(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('divisions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting division:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/divisions');
  return { success: true };
}
