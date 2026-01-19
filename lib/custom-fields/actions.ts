'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CustomFieldDefinition, FieldType } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateCustomFieldInput {
  name: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  order: number;
}

export interface UpdateCustomFieldInput {
  name?: string;
  field_type?: FieldType;
  options?: string[] | null;
  required?: boolean;
  order?: number;
}

/**
 * Get all custom field definitions ordered by order field
 */
export async function getCustomFields(): Promise<CustomFieldDefinition[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .order('order');

  if (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }

  return data as CustomFieldDefinition[] || [];
}

/**
 * Get a single custom field definition by ID
 */
export async function getCustomField(id: string): Promise<CustomFieldDefinition | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('id', id)
    .single<CustomFieldDefinition>();

  if (error) {
    console.error('Error fetching custom field:', error);
    return null;
  }

  return data;
}

/**
 * Get the next order value for a new custom field
 */
export async function getNextCustomFieldOrder(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
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
 * Create a new custom field definition
 */
export async function createCustomField(
  field: CreateCustomFieldInput
): Promise<ActionResult<CustomFieldDefinition>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      name: field.name,
      field_type: field.field_type,
      options: field.options,
      required: field.required,
      order: field.order,
    } as never)
    .select()
    .single<CustomFieldDefinition>();

  if (error) {
    console.error('Error creating custom field:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/custom-fields');
  return { success: true, data };
}

/**
 * Update an existing custom field definition
 */
export async function updateCustomField(
  id: string,
  field: UpdateCustomFieldInput
): Promise<ActionResult<CustomFieldDefinition>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update({
      name: field.name,
      field_type: field.field_type,
      options: field.options,
      required: field.required,
      order: field.order,
    } as never)
    .eq('id', id)
    .select()
    .single<CustomFieldDefinition>();

  if (error) {
    console.error('Error updating custom field:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/custom-fields');
  return { success: true, data };
}

/**
 * Delete a custom field definition
 */
export async function deleteCustomField(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('custom_field_definitions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting custom field:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/custom-fields');
  return { success: true };
}

/**
 * Reorder custom fields by updating their order values
 */
export async function reorderCustomFields(
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // Update each custom field with its new order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('custom_field_definitions')
      .update({ order: index } as never)
      .eq('id', id)
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find(r => r.error);
  if (failedUpdate?.error) {
    console.error('Error reordering custom fields:', failedUpdate.error);
    return { success: false, error: failedUpdate.error.message };
  }

  revalidatePath('/admin/custom-fields');
  return { success: true };
}
