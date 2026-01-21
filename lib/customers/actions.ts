'use server';

import { createClient } from '@/lib/supabase/server';
import type { Customer, Job, CustomerWithJobs, JobWithCustomer } from '@/lib/database.types';

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ Customer Actions ============

/**
 * Get all customers ordered by name
 */
export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  return (data as Customer[]) || [];
}

/**
 * Get all customers with their jobs
 */
export async function getCustomersWithJobs(): Promise<CustomerWithJobs[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      jobs (*)
    `)
    .order('name');

  if (error) {
    console.error('Error fetching customers with jobs:', error);
    return [];
  }

  return (data as CustomerWithJobs[]) || [];
}

/**
 * Get a single customer by ID with their jobs
 */
export async function getCustomer(id: string): Promise<CustomerWithJobs | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      jobs (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }

  return data as CustomerWithJobs;
}

export interface CreateCustomerInput {
  name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Create a new customer
 */
export async function createCustomer(input: CreateCustomerInput): Promise<ActionResult<Customer>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: input.name,
      contact_phone: input.contact_phone || null,
      contact_email: input.contact_email || null,
      address: input.address || null,
      notes: input.notes || null,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return { success: false, error: 'Unable to create customer' };
  }

  return { success: true, data: data as Customer };
}

export interface UpdateCustomerInput {
  name?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  notes?: string | null;
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<ActionResult<Customer>> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.contact_phone !== undefined) updateData.contact_phone = input.contact_phone;
  if (input.contact_email !== undefined) updateData.contact_email = input.contact_email;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data, error } = await supabase
    .from('customers')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: 'Unable to update customer' };
  }

  return { success: true, data: data as Customer };
}

/**
 * Delete a customer (cascades to jobs)
 */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Unable to delete customer' };
  }

  return { success: true };
}

// ============ Job Actions ============

/**
 * Get all active jobs with customer info (for task dropdown)
 */
export async function getActiveJobsWithCustomer(): Promise<JobWithCustomer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers (*)
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }

  return (data as JobWithCustomer[]) || [];
}

/**
 * Get a single job by ID with customer
 */
export async function getJob(id: string): Promise<JobWithCustomer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }

  return data as JobWithCustomer;
}

export interface CreateJobInput {
  customer_id: string;
  name: string;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Create a new job under a customer
 */
export async function createJob(input: CreateJobInput): Promise<ActionResult<Job>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      customer_id: input.customer_id,
      name: input.name,
      address: input.address || null,
      location_lat: input.location_lat || null,
      location_lng: input.location_lng || null,
      notes: input.notes || null,
      is_active: input.is_active ?? true,
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    return { success: false, error: 'Unable to create job' };
  }

  return { success: true, data: data as Job };
}

export interface UpdateJobInput {
  name?: string;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Update an existing job
 */
export async function updateJob(id: string, input: UpdateJobInput): Promise<ActionResult<Job>> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.location_lat !== undefined) updateData.location_lat = input.location_lat;
  if (input.location_lng !== undefined) updateData.location_lng = input.location_lng;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('jobs')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    return { success: false, error: 'Unable to update job' };
  }

  return { success: true, data: data as Job };
}

/**
 * Delete a job
 */
export async function deleteJob(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting job:', error);
    return { success: false, error: 'Unable to delete job' };
  }

  return { success: true };
}
