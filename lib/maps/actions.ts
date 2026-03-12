'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin } from '@/lib/auth/actions';
import type { ActionResult } from '@/lib/types';
import type {
  StripingMap,
  StripingSegment,
  StripingMapWithSegments,
  TaskSegmentAssignmentWithSegment,
  GeoJSONLineString,
  StripeType,
  SegmentAttributes,
} from './types';

/**
 * Get all striping maps (admin only)
 */
export async function getStripingMaps(): Promise<StripingMap[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('striping_maps')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching striping maps:', error);
    return [];
  }

  return (data ?? []) as StripingMap[];
}

/**
 * Get a striping map with its segments
 */
export async function getStripingMap(id: string): Promise<StripingMapWithSegments | null> {
  await requireAuth();
  const supabase = await createClient();

  const { data: map, error: mapError } = await supabase
    .from('striping_maps')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (mapError || !map) return null;

  const { data: segments, error: segError } = await supabase
    .from('striping_segments')
    .select('*')
    .eq('map_id', id)
    .order('order', { ascending: true });

  if (segError) {
    console.error('Error fetching segments:', segError);
  }

  return {
    ...(map as StripingMap),
    segments: (segments ?? []) as StripingSegment[],
  };
}

/**
 * Get segment count per map (for list display)
 */
export async function getMapSegmentCounts(): Promise<Record<string, number>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('striping_segments')
    .select('map_id');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as Array<{ map_id: string }>) {
    counts[row.map_id] = (counts[row.map_id] || 0) + 1;
  }
  return counts;
}

/**
 * Create a new striping map
 */
export async function createStripingMap(input: {
  name: string;
  description?: string;
  center_lng?: number;
  center_lat?: number;
  zoom?: number;
  version_label?: string;
}): Promise<ActionResult<StripingMap>> {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('striping_maps')
    .insert({
      name: input.name,
      description: input.description || null,
      center_lng: input.center_lng ?? null,
      center_lat: input.center_lat ?? null,
      zoom: input.zoom ?? 17,
      version_label: input.version_label || null,
      created_by: user.id,
    } as never)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/maps');
  return { success: true, data: data as StripingMap };
}

/**
 * Update a striping map
 */
export async function updateStripingMap(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    center_lng?: number;
    center_lat?: number;
    zoom?: number;
    version_label?: string | null;
  }
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('striping_maps')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/maps');
  revalidatePath(`/admin/maps/${id}`);
  return { success: true };
}

/**
 * Soft delete a striping map
 */
export async function deleteStripingMap(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('striping_maps')
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/maps');
  return { success: true };
}

/**
 * Clone a striping map with all its segments
 */
export async function cloneStripingMap(
  sourceId: string,
  newName: string,
  versionLabel?: string
): Promise<ActionResult<StripingMap>> {
  const user = await requireAdmin();
  const supabase = await createClient();

  // Get original map
  const { data: original, error: fetchError } = await supabase
    .from('striping_maps')
    .select('*')
    .eq('id', sourceId)
    .single<StripingMap>();

  if (fetchError || !original) {
    return { success: false, error: 'Source map not found' };
  }

  // Create cloned map
  const { data: clonedMap, error: cloneError } = await supabase
    .from('striping_maps')
    .insert({
      name: newName,
      description: original.description,
      center_lng: original.center_lng,
      center_lat: original.center_lat,
      zoom: original.zoom,
      version_label: versionLabel || null,
      cloned_from_id: sourceId,
      created_by: user.id,
    } as never)
    .select()
    .single<StripingMap>();

  if (cloneError || !clonedMap) {
    return { success: false, error: cloneError?.message || 'Failed to clone map' };
  }

  // Copy segments
  const { data: segments } = await supabase
    .from('striping_segments')
    .select('*')
    .eq('map_id', sourceId)
    .order('order');

  if (segments && segments.length > 0) {
    const newSegments = (segments as StripingSegment[]).map((seg) => ({
      map_id: clonedMap.id,
      geometry: seg.geometry,
      stripe_type: seg.stripe_type,
      attributes: seg.attributes,
      notes: seg.notes,
      order: seg.order,
    }));

    await supabase.from('striping_segments').insert(newSegments as never);
  }

  revalidatePath('/admin/maps');
  return { success: true, data: clonedMap as StripingMap };
}

/**
 * Batch save segments for a map (upsert)
 */
export async function upsertSegments(
  mapId: string,
  segments: Array<{
    id?: string;
    geometry: GeoJSONLineString;
    stripe_type: StripeType;
    attributes?: SegmentAttributes | null;
    notes?: string | null;
    order: number;
  }>
): Promise<ActionResult<StripingSegment[]>> {
  await requireAdmin();
  const supabase = await createClient();

  // Delete existing segments not in the update list
  const existingIds = segments.filter(s => s.id).map(s => s.id!);

  if (existingIds.length > 0) {
    await supabase
      .from('striping_segments')
      .delete()
      .eq('map_id', mapId)
      .not('id', 'in', `(${existingIds.join(',')})`);
  } else {
    // Delete all existing segments
    await supabase
      .from('striping_segments')
      .delete()
      .eq('map_id', mapId);
  }

  // Upsert all segments
  const rows = segments.map(s => ({
    ...(s.id ? { id: s.id } : {}),
    map_id: mapId,
    geometry: s.geometry,
    stripe_type: s.stripe_type,
    attributes: s.attributes || null,
    notes: s.notes || null,
    order: s.order,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('striping_segments')
    .upsert(rows as never, { onConflict: 'id' })
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/maps/${mapId}`);
  return { success: true, data: (data ?? []) as StripingSegment[] };
}

/**
 * Assign segments to a task
 */
export async function assignSegmentsToTask(
  taskId: string,
  segmentIds: string[]
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const rows = segmentIds.map(segmentId => ({
    task_id: taskId,
    segment_id: segmentId,
    is_complete: false,
  }));

  const { error } = await supabase
    .from('task_segment_assignments')
    .upsert(rows as never, { onConflict: 'task_id,segment_id' });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}

/**
 * Remove segment assignments from a task
 */
export async function removeSegmentsFromTask(
  taskId: string,
  segmentIds?: string[]
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from('task_segment_assignments')
    .delete()
    .eq('task_id', taskId);

  if (segmentIds && segmentIds.length > 0) {
    query = query.in('segment_id', segmentIds);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}

/**
 * Get task segments with geometry (for field user map view)
 */
export async function getTaskSegments(
  taskId: string
): Promise<TaskSegmentAssignmentWithSegment[]> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('task_segment_assignments')
    .select(`
      *,
      segment:striping_segments(*)
    `)
    .eq('task_id', taskId);

  if (error) {
    console.error('Error fetching task segments:', error);
    return [];
  }

  return (data ?? []) as TaskSegmentAssignmentWithSegment[];
}

/**
 * Mark a segment assignment as complete/incomplete (field user action)
 */
export async function markSegmentComplete(
  assignmentId: string,
  isComplete: boolean
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from('task_segment_assignments')
    .update({
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
      completed_by: isComplete ? user.id : null,
    } as never)
    .eq('id', assignmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if a task has any assigned segments (lightweight check for UI)
 */
export async function taskHasSegments(taskId: string): Promise<boolean> {
  await requireAuth();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('task_segment_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Get all tasks for segment assignment dialog
 */
export async function getTasksForAssignment(): Promise<Array<{ id: string; title: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return (data ?? []) as Array<{ id: string; title: string }>;
}
