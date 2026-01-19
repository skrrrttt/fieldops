'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  Checklist,
  ChecklistItem,
  ChecklistWithItems,
  TaskChecklist,
  TaskChecklistWithDetails,
} from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateChecklistInput {
  name: string;
  description?: string | null;
  order: number;
}

export interface UpdateChecklistInput {
  name?: string;
  description?: string | null;
  order?: number;
}

export interface CreateChecklistItemInput {
  checklist_id: string;
  title: string;
  order: number;
}

export interface UpdateChecklistItemInput {
  title?: string;
  order?: number;
}

/**
 * Get all checklists ordered by order field
 */
export async function getChecklists(): Promise<Checklist[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .order('order');

  if (error) {
    console.error('Error fetching checklists:', error);
    return [];
  }

  return (data as Checklist[]) || [];
}

/**
 * Get all checklists with their items
 */
export async function getChecklistsWithItems(): Promise<ChecklistWithItems[]> {
  const supabase = await createClient();

  const { data: checklists, error: checklistsError } = await supabase
    .from('checklists')
    .select('*')
    .order('order');

  if (checklistsError) {
    console.error('Error fetching checklists:', checklistsError);
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('*')
    .order('order');

  if (itemsError) {
    console.error('Error fetching checklist items:', itemsError);
    return [];
  }

  // Group items by checklist_id
  const itemsByChecklist = (items as ChecklistItem[]).reduce(
    (acc, item) => {
      if (!acc[item.checklist_id]) {
        acc[item.checklist_id] = [];
      }
      acc[item.checklist_id].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  return (checklists as Checklist[]).map((checklist) => ({
    ...checklist,
    items: itemsByChecklist[checklist.id] || [],
  }));
}

/**
 * Get a single checklist by ID with its items
 */
export async function getChecklist(
  id: string
): Promise<ChecklistWithItems | null> {
  const supabase = await createClient();

  const { data: checklist, error: checklistError } = await supabase
    .from('checklists')
    .select('*')
    .eq('id', id)
    .single<Checklist>();

  if (checklistError) {
    console.error('Error fetching checklist:', checklistError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('checklist_id', id)
    .order('order');

  if (itemsError) {
    console.error('Error fetching checklist items:', itemsError);
    return null;
  }

  return {
    ...checklist,
    items: (items as ChecklistItem[]) || [],
  };
}

/**
 * Get the next order value for a new checklist
 */
export async function getNextChecklistOrder(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklists')
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
 * Create a new checklist
 */
export async function createChecklist(
  checklist: CreateChecklistInput
): Promise<ActionResult<Checklist>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklists')
    .insert({
      name: checklist.name,
      description: checklist.description || null,
      order: checklist.order,
    } as never)
    .select()
    .single<Checklist>();

  if (error) {
    console.error('Error creating checklist:', error);
    return { success: false, error: 'Unable to create checklist' };
  }

  revalidatePath('/admin/checklists');
  return { success: true, data };
}

/**
 * Update an existing checklist
 */
export async function updateChecklist(
  id: string,
  checklist: UpdateChecklistInput
): Promise<ActionResult<Checklist>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklists')
    .update({
      name: checklist.name,
      description: checklist.description,
      order: checklist.order,
    } as never)
    .eq('id', id)
    .select()
    .single<Checklist>();

  if (error) {
    console.error('Error updating checklist:', error);
    return { success: false, error: 'Unable to update checklist' };
  }

  revalidatePath('/admin/checklists');
  return { success: true, data };
}

/**
 * Delete a checklist (will fail if attached to tasks due to RESTRICT)
 */
export async function deleteChecklist(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if checklist is attached to any tasks
  const { data: taskChecklists } = await supabase
    .from('task_checklists')
    .select('id')
    .eq('checklist_id', id)
    .limit(1);

  if (taskChecklists && taskChecklists.length > 0) {
    return {
      success: false,
      error:
        'Cannot delete checklist that is attached to tasks. Remove it from all tasks first.',
    };
  }

  const { error } = await supabase.from('checklists').delete().eq('id', id);

  if (error) {
    console.error('Error deleting checklist:', error);
    return { success: false, error: 'Unable to delete checklist' };
  }

  revalidatePath('/admin/checklists');
  return { success: true };
}

/**
 * Reorder checklists by updating their order values
 */
export async function reorderChecklists(
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('checklists')
      .update({ order: index } as never)
      .eq('id', id)
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find((r) => r.error);
  if (failedUpdate?.error) {
    console.error('Error reordering checklists:', failedUpdate.error);
    return { success: false, error: failedUpdate.error.message };
  }

  revalidatePath('/admin/checklists');
  return { success: true };
}

// ============= Checklist Items =============

/**
 * Get the next order value for a new checklist item
 */
export async function getNextChecklistItemOrder(
  checklistId: string
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklist_items')
    .select('order')
    .eq('checklist_id', checklistId)
    .order('order', { ascending: false })
    .limit(1)
    .single<{ order: number }>();

  if (error || !data) {
    return 0;
  }

  return data.order + 1;
}

/**
 * Create a new checklist item
 */
export async function createChecklistItem(
  item: CreateChecklistItemInput
): Promise<ActionResult<ChecklistItem>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      checklist_id: item.checklist_id,
      title: item.title,
      order: item.order,
    } as never)
    .select()
    .single<ChecklistItem>();

  if (error) {
    console.error('Error creating checklist item:', error);
    return { success: false, error: 'Unable to create checklist item' };
  }

  revalidatePath('/admin/checklists');
  return { success: true, data };
}

/**
 * Update an existing checklist item
 */
export async function updateChecklistItem(
  id: string,
  item: UpdateChecklistItemInput
): Promise<ActionResult<ChecklistItem>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checklist_items')
    .update({
      title: item.title,
      order: item.order,
    } as never)
    .eq('id', id)
    .select()
    .single<ChecklistItem>();

  if (error) {
    console.error('Error updating checklist item:', error);
    return { success: false, error: 'Unable to update checklist item' };
  }

  revalidatePath('/admin/checklists');
  return { success: true, data };
}

/**
 * Delete a checklist item
 */
export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting checklist item:', error);
    return { success: false, error: 'Unable to delete checklist item' };
  }

  revalidatePath('/admin/checklists');
  return { success: true };
}

/**
 * Reorder checklist items within a checklist
 */
export async function reorderChecklistItems(
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('checklist_items')
      .update({ order: index } as never)
      .eq('id', id)
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find((r) => r.error);
  if (failedUpdate?.error) {
    console.error('Error reordering checklist items:', failedUpdate.error);
    return { success: false, error: failedUpdate.error.message };
  }

  revalidatePath('/admin/checklists');
  return { success: true };
}

// ============= Task Checklists =============

/**
 * Get all checklists attached to a task with their items and completion status
 */
export async function getTaskChecklists(
  taskId: string
): Promise<TaskChecklistWithDetails[]> {
  const supabase = await createClient();

  const { data: taskChecklists, error: tcError } = await supabase
    .from('task_checklists')
    .select('*')
    .eq('task_id', taskId);

  if (tcError) {
    console.error('Error fetching task checklists:', tcError);
    return [];
  }

  if (!taskChecklists || taskChecklists.length === 0) {
    return [];
  }

  // Get checklist IDs
  const checklistIds = (taskChecklists as TaskChecklist[]).map(
    (tc) => tc.checklist_id
  );

  // Fetch checklists
  const { data: checklists, error: clError } = await supabase
    .from('checklists')
    .select('*')
    .in('id', checklistIds)
    .order('order');

  if (clError) {
    console.error('Error fetching checklists:', clError);
    return [];
  }

  // Fetch items for these checklists
  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('*')
    .in('checklist_id', checklistIds)
    .order('order');

  if (itemsError) {
    console.error('Error fetching checklist items:', itemsError);
    return [];
  }

  // Group items by checklist_id
  const itemsByChecklist = (items as ChecklistItem[]).reduce(
    (acc, item) => {
      if (!acc[item.checklist_id]) {
        acc[item.checklist_id] = [];
      }
      acc[item.checklist_id].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  // Create checklist map
  const checklistMap = (checklists as Checklist[]).reduce(
    (acc, cl) => {
      acc[cl.id] = {
        ...cl,
        items: itemsByChecklist[cl.id] || [],
      };
      return acc;
    },
    {} as Record<string, ChecklistWithItems>
  );

  // Build result
  return (taskChecklists as TaskChecklist[])
    .map((tc) => ({
      ...tc,
      checklist: checklistMap[tc.checklist_id],
    }))
    .filter((tc) => tc.checklist) // Filter out any orphaned task_checklists
    .sort((a, b) => a.checklist.order - b.checklist.order);
}

/**
 * Attach a checklist to a task
 */
export async function attachChecklistToTask(
  taskId: string,
  checklistId: string
): Promise<ActionResult<TaskChecklist>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_checklists')
    .insert({
      task_id: taskId,
      checklist_id: checklistId,
      item_completions: {},
    } as never)
    .select()
    .single<TaskChecklist>();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return {
        success: false,
        error: 'This checklist is already attached to this task',
      };
    }
    console.error('Error attaching checklist to task:', error);
    return { success: false, error: 'Unable to attach checklist to task' };
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/admin/tasks');
  return { success: true, data };
}

/**
 * Remove a checklist from a task
 */
export async function removeChecklistFromTask(
  taskId: string,
  checklistId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('task_checklists')
    .delete()
    .eq('task_id', taskId)
    .eq('checklist_id', checklistId);

  if (error) {
    console.error('Error removing checklist from task:', error);
    return { success: false, error: 'Unable to remove checklist from task' };
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/admin/tasks');
  return { success: true };
}

/**
 * Toggle completion of a checklist item for a task
 */
export async function toggleChecklistItemCompletion(
  taskChecklistId: string,
  itemId: string,
  completed: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current completions
  const { data: current, error: fetchError } = await supabase
    .from('task_checklists')
    .select('item_completions, task_id')
    .eq('id', taskChecklistId)
    .single<{ item_completions: Record<string, boolean>; task_id: string }>();

  if (fetchError || !current) {
    console.error('Error fetching task checklist:', fetchError);
    return { success: false, error: 'Unable to update checklist item' };
  }

  // Update completions
  const newCompletions = {
    ...current.item_completions,
    [itemId]: completed,
  };

  const { error: updateError } = await supabase
    .from('task_checklists')
    .update({ item_completions: newCompletions } as never)
    .eq('id', taskChecklistId);

  if (updateError) {
    console.error('Error updating checklist completions:', updateError);
    return { success: false, error: 'Unable to update checklist item' };
  }

  revalidatePath(`/tasks/${current.task_id}`);
  return { success: true };
}

/**
 * Get checklist IDs attached to a task (for the task modal)
 */
export async function getTaskChecklistIds(taskId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_checklists')
    .select('checklist_id')
    .eq('task_id', taskId);

  if (error) {
    console.error('Error fetching task checklist IDs:', error);
    return [];
  }

  return (data || []).map(
    (tc: { checklist_id: string }) => tc.checklist_id
  );
}

/**
 * Sync checklists for a task (add new ones, remove ones no longer selected)
 */
export async function syncTaskChecklists(
  taskId: string,
  checklistIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current checklist IDs for this task
  const currentIds = await getTaskChecklistIds(taskId);

  // Determine which to add and which to remove
  const toAdd = checklistIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !checklistIds.includes(id));

  // Add new checklists
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from('task_checklists').insert(
      toAdd.map((checklistId) => ({
        task_id: taskId,
        checklist_id: checklistId,
        item_completions: {},
      })) as never
    );

    if (insertError) {
      console.error('Error adding task checklists:', insertError);
      return { success: false, error: 'Unable to update task checklists' };
    }
  }

  // Remove old checklists
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('task_checklists')
      .delete()
      .eq('task_id', taskId)
      .in('checklist_id', toRemove);

    if (deleteError) {
      console.error('Error removing task checklists:', deleteError);
      return { success: false, error: 'Unable to update task checklists' };
    }
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/admin/tasks');
  return { success: true };
}
