'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TaskTemplate } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateTemplateInput {
  name: string;
  default_title: string | null;
  default_description: string | null;
  default_division_id: string | null;
  default_custom_fields: Record<string, unknown> | null;
}

export interface UpdateTemplateInput {
  name?: string;
  default_title?: string | null;
  default_description?: string | null;
  default_division_id?: string | null;
  default_custom_fields?: Record<string, unknown> | null;
}

/**
 * Get all task templates ordered by name
 */
export async function getTemplates(): Promise<TaskTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data as TaskTemplate[] || [];
}

/**
 * Get templates with division information
 */
export async function getTemplatesWithDivision(): Promise<(TaskTemplate & { division: { id: string; name: string; color: string } | null })[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_templates')
    .select('*, division:divisions(id, name, color)')
    .order('name');

  if (error) {
    console.error('Error fetching templates with division:', error);
    return [];
  }

  return data as (TaskTemplate & { division: { id: string; name: string; color: string } | null })[] || [];
}

/**
 * Get a single task template by ID
 */
export async function getTemplate(id: string): Promise<TaskTemplate | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', id)
    .single<TaskTemplate>();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data;
}

/**
 * Create a new task template
 */
export async function createTemplate(
  template: CreateTemplateInput
): Promise<ActionResult<TaskTemplate>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      name: template.name,
      default_title: template.default_title,
      default_description: template.default_description,
      default_division_id: template.default_division_id,
      default_custom_fields: template.default_custom_fields,
    } as never)
    .select()
    .single<TaskTemplate>();

  if (error) {
    console.error('Error creating template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/templates');
  return { success: true, data };
}

/**
 * Update an existing task template
 */
export async function updateTemplate(
  id: string,
  template: UpdateTemplateInput
): Promise<ActionResult<TaskTemplate>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_templates')
    .update({
      name: template.name,
      default_title: template.default_title,
      default_description: template.default_description,
      default_division_id: template.default_division_id,
      default_custom_fields: template.default_custom_fields,
    } as never)
    .eq('id', id)
    .select()
    .single<TaskTemplate>();

  if (error) {
    console.error('Error updating template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/templates');
  return { success: true, data };
}

/**
 * Delete a task template
 */
export async function deleteTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/templates');
  return { success: true };
}
