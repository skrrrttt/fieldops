'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/database.types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Get the currently authenticated user with their role
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user role from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: UserRole }>();

  if (userError || !userData) {
    // User exists in auth but not in users table - default to field_user
    return {
      id: user.id,
      email: user.email || '',
      role: 'field_user',
    };
  }

  return {
    id: user.id,
    email: user.email || '',
    role: userData.role,
  };
}

/**
 * Sign out the current user and redirect to login
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Require admin role - redirect if not admin
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    redirect('/tasks');
  }
  return user;
}
