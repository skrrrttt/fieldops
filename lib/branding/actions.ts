'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Branding } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateBrandingInput {
  logo_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  app_name?: string;
}

/**
 * Get the current branding settings
 * Returns the first (and typically only) branding record, or null if none exists
 */
export async function getBranding(): Promise<Branding | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('branding')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single<Branding>();

  if (error) {
    // If no branding exists, return null (not an error)
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching branding:', error);
    return null;
  }

  return data;
}

/**
 * Create initial branding settings
 */
export async function createBranding(
  branding: UpdateBrandingInput
): Promise<ActionResult<Branding>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('branding')
    .insert({
      logo_url: branding.logo_url || null,
      primary_color: branding.primary_color || '#3b82f6',
      accent_color: branding.accent_color || '#10b981',
      app_name: branding.app_name || 'Flux',
    } as never)
    .select()
    .single<Branding>();

  if (error) {
    console.error('Error creating branding:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/branding');
  revalidatePath('/');
  return { success: true, data };
}

/**
 * Update existing branding settings
 */
export async function updateBranding(
  id: string,
  branding: UpdateBrandingInput
): Promise<ActionResult<Branding>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('branding')
    .update({
      logo_url: branding.logo_url,
      primary_color: branding.primary_color,
      accent_color: branding.accent_color,
      app_name: branding.app_name,
    } as never)
    .eq('id', id)
    .select()
    .single<Branding>();

  if (error) {
    console.error('Error updating branding:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/branding');
  revalidatePath('/');
  return { success: true, data };
}

/**
 * Upload a logo to Supabase Storage and return the public URL
 */
export async function uploadLogo(formData: FormData): Promise<ActionResult<string>> {
  const supabase = await createClient();

  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (file.type && !validTypes.includes(file.type)) {
    return { success: false, error: `Invalid file type: ${file.type}. Please upload a PNG, JPEG, GIF, WebP, or SVG.` };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'png';
  const filename = `logo-${timestamp}.${ext}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Upload to storage (directly to branding bucket, no subfolder)
  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(filename, buffer, {
      contentType: file.type || 'image/png',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading logo:', uploadError);
    // Provide more helpful error messages
    if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
      return { success: false, error: 'Storage bucket "branding" not found. Please create it in Supabase Dashboard > Storage.' };
    }
    if (uploadError.message.includes('policy') || uploadError.message.includes('permission')) {
      return { success: false, error: 'Permission denied. Check storage policies in Supabase Dashboard.' };
    }
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('branding')
    .getPublicUrl(filename);

  return { success: true, data: publicUrlData.publicUrl };
}

/**
 * Delete the old logo from storage
 */
export async function deleteOldLogo(logoUrl: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Extract filename from URL (format: .../branding/logo-xxx.png)
  const urlParts = logoUrl.split('/branding/');
  if (urlParts.length < 2) {
    return { success: false, error: 'Invalid logo URL' };
  }

  // Get just the filename (last part after /branding/)
  const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params if any

  const { error } = await supabase.storage
    .from('branding')
    .remove([filename]);

  if (error) {
    console.error('Error deleting old logo:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Save branding settings (creates if none exists, updates if exists)
 */
export async function saveBranding(
  branding: UpdateBrandingInput
): Promise<ActionResult<Branding>> {
  const existingBranding = await getBranding();

  if (existingBranding) {
    return updateBranding(existingBranding.id, branding);
  } else {
    return createBranding(branding);
  }
}
