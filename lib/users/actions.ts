'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/actions';
import type { User, UserRole } from '@/lib/database.types';
import type { ActionResult } from '@/lib/types';

/**
 * Get all users with their status
 */
export async function getUsers(): Promise<User[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('email');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data as User[]) || [];
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single<User>();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Invite a new user via Supabase Auth
 * This creates an auth user and sends an invite email
 */
export async function inviteUser(
  email: string,
  role: UserRole
): Promise<ActionResult<{ userId: string }>> {
  await requireAdmin();
  const adminClient = createAdminClient();
  const supabase = await createClient();

  // Use service_role client for admin auth operations
  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role: role,
    },
  });

  if (authError) {
    console.error('Error inviting user:', authError);
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Failed to create user' };
  }

  // Create user record in users table
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: email,
      role: role,
      is_active: true,
    } as never);

  if (userError) {
    console.error('Error creating user record:', userError);
    return { success: false, error: userError.message };
  }

  revalidatePath('/admin/users');
  return { success: true, data: { userId: authData.user.id } };
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<ActionResult<User>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update({ role } as never)
    .eq('id', userId)
    .select()
    .single<User>();

  if (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/users');
  return { success: true, data };
}

/**
 * Deactivate a user (revokes access but preserves history)
 */
export async function deactivateUser(userId: string): Promise<ActionResult<User>> {
  await requireAdmin();
  const supabase = await createClient();

  // Update user status to inactive
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: false } as never)
    .eq('id', userId)
    .select()
    .single<User>();

  if (error) {
    console.error('Error deactivating user:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/users');
  return { success: true, data };
}

/**
 * Reactivate a previously deactivated user
 */
export async function reactivateUser(userId: string): Promise<ActionResult<User>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update({ is_active: true } as never)
    .eq('id', userId)
    .select()
    .single<User>();

  if (error) {
    console.error('Error reactivating user:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  revalidatePath('/admin/users');
  return { success: true, data };
}

/**
 * Update a user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() } as never)
    .eq('id', userId);

  if (error) {
    console.error('Error updating last active:', error);
    return { success: false, error: 'Unable to complete this operation' };
  }

  return { success: true };
}
