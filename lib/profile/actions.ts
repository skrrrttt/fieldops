'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export async function updateProfile(data: {
  display_name?: string | null;
}): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('users')
    .update({
      display_name: data.display_name?.trim() || null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  // Revalidate all pages that display user info
  revalidatePath('/profile');
  revalidatePath('/tasks', 'layout');
  revalidatePath('/admin', 'layout');
  return { success: true };
}

export async function uploadAvatar(formData: FormData): Promise<UpdateProfileResult & { url?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('avatar') as File;
  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type (with iOS fallback where file.type can be empty)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

  const isValidType = allowedTypes.includes(file.type) ||
    ((!file.type || file.type === 'application/octet-stream') && allowedExtensions.includes(fileExt));

  if (!isValidType) {
    return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or HEIC image.' };
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'File too large. Maximum size is 5MB.' };
  }

  // Generate unique filename (reuse fileExt from validation above)
  const fileName = `${user.id}/${Date.now()}.${fileExt || 'jpg'}`;

  // Delete old avatar if exists
  const { data: currentUser } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single<{ avatar_url: string | null }>();

  if (currentUser?.avatar_url) {
    // Extract path from URL
    const oldPath = currentUser.avatar_url.split('/avatars/')[1];
    if (oldPath) {
      await supabase.storage.from('avatars').remove([oldPath]);
    }
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Update user record with avatar URL
  const { error: updateError } = await supabase
    .from('users')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating avatar URL:', updateError);
    return { success: false, error: updateError.message };
  }

  // Revalidate all pages that display user info
  revalidatePath('/profile');
  revalidatePath('/tasks', 'layout');
  revalidatePath('/admin', 'layout');
  return { success: true, url: publicUrl };
}

export async function removeAvatar(): Promise<UpdateProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get current avatar URL
  const { data: currentUser } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single<{ avatar_url: string | null }>();

  if (currentUser?.avatar_url) {
    // Extract path from URL and delete
    const oldPath = currentUser.avatar_url.split('/avatars/')[1];
    if (oldPath) {
      await supabase.storage.from('avatars').remove([oldPath]);
    }
  }

  // Update user record to remove avatar URL
  const { error } = await supabase
    .from('users')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id);

  if (error) {
    console.error('Error removing avatar:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  // Revalidate all pages that display user info
  revalidatePath('/profile');
  revalidatePath('/tasks', 'layout');
  revalidatePath('/admin', 'layout');
  return { success: true };
}
