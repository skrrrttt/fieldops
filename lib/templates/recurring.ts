'use server';

import { createClient } from '@/lib/supabase/server';
import type { TaskTemplate, RecurrenceRule } from '@/lib/database.types';
import { calculateNextGenerationDate } from './recurrence-utils';

export type RecurringTemplate = TaskTemplate & {
  recurrence_rule: RecurrenceRule;
  division?: { id: string; name: string } | null;
};

export type GenerationResult = {
  templateId: string;
  templateName: string;
  taskId?: string;
  success: boolean;
  error?: string;
};

/**
 * Get all active recurring templates that are due for generation
 */
export async function getTemplatesDueForGeneration(): Promise<RecurringTemplate[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('task_templates')
    .select('*, division:divisions(id, name)')
    .eq('is_active', true)
    .not('recurrence_rule', 'is', null)
    .lte('next_generation_at', now);

  if (error) {
    console.error('Error fetching due templates:', error);
    return [];
  }

  return (data as RecurringTemplate[]) || [];
}

/**
 * Get default status ID for new tasks
 */
async function getDefaultStatusId(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('statuses')
    .select('id')
    .eq('is_default', true)
    .single();

  const result = data as { id: string } | null;
  return result?.id || null;
}

/**
 * Determine which user to assign based on recurrence rule
 */
async function determineAssignedUser(
  rule: RecurrenceRule,
  lastAssignedIndex?: number
): Promise<{ userId: string | null; nextIndex: number }> {
  if (rule.assignTo === 'fixed' && rule.fixedUserId) {
    return { userId: rule.fixedUserId, nextIndex: 0 };
  }

  if (rule.assignTo === 'rotate' && rule.rotationUserIds && rule.rotationUserIds.length > 0) {
    const nextIndex = ((lastAssignedIndex ?? -1) + 1) % rule.rotationUserIds.length;
    return { userId: rule.rotationUserIds[nextIndex], nextIndex };
  }

  return { userId: null, nextIndex: 0 };
}

/**
 * Generate a task from a recurring template
 */
export async function generateTaskFromTemplate(
  template: RecurringTemplate
): Promise<GenerationResult> {
  const supabase = await createClient();

  try {
    // Get default status
    const defaultStatusId = await getDefaultStatusId();
    if (!defaultStatusId) {
      return {
        templateId: template.id,
        templateName: template.name,
        success: false,
        error: 'No default status found',
      };
    }

    // Determine assignment
    const { userId } = await determineAssignedUser(template.recurrence_rule);

    // Create the task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: template.default_title || template.name,
        description: template.default_description,
        status_id: defaultStatusId,
        division_id: template.default_division_id,
        template_id: template.id,
        assigned_user_id: userId,
        custom_fields: template.default_custom_fields,
      } as never)
      .select('id')
      .single();

    if (taskError) {
      return {
        templateId: template.id,
        templateName: template.name,
        success: false,
        error: taskError.message,
      };
    }

    const task = taskData as { id: string } | null;

    // Update template with generation timestamps
    const nextGeneration = calculateNextGenerationDate(template.recurrence_rule);

    const { error: updateError } = await supabase
      .from('task_templates')
      .update({
        last_generated_at: new Date().toISOString(),
        next_generation_at: nextGeneration.toISOString(),
      } as never)
      .eq('id', template.id);

    if (updateError) {
      console.error('Error updating template timestamps:', updateError);
    }

    return {
      templateId: template.id,
      templateName: template.name,
      taskId: task?.id,
      success: true,
    };
  } catch (err) {
    return {
      templateId: template.id,
      templateName: template.name,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Process all due recurring templates and generate tasks
 */
export async function processRecurringTemplates(): Promise<GenerationResult[]> {
  const templates = await getTemplatesDueForGeneration();
  const results: GenerationResult[] = [];

  for (const template of templates) {
    const result = await generateTaskFromTemplate(template);
    results.push(result);
  }

  return results;
}

/**
 * Activate a template for recurring generation
 */
export async function activateRecurringTemplate(
  templateId: string,
  rule: RecurrenceRule
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const nextGeneration = calculateNextGenerationDate(rule);

  const { error } = await supabase
    .from('task_templates')
    .update({
      recurrence_rule: rule,
      is_active: true,
      next_generation_at: nextGeneration.toISOString(),
    } as never)
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a recurring template
 */
export async function deactivateRecurringTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('task_templates')
    .update({
      is_active: false,
      next_generation_at: null,
    } as never)
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
