-- Migration: Add Customers and Jobs tables for CRM functionality
-- This replaces the task templates feature with a Customer/Job system

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Jobs table
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add job_id to tasks table
ALTER TABLE tasks ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_tasks_job_id ON tasks(job_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_jobs_name ON jobs(name);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
-- All authenticated users can view customers
CREATE POLICY "Users can view customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert customers
CREATE POLICY "Admins can insert customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can update customers
CREATE POLICY "Admins can update customers" ON customers
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for jobs
-- All authenticated users can view jobs
CREATE POLICY "Users can view jobs" ON jobs
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert jobs
CREATE POLICY "Admins can insert jobs" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can update jobs
CREATE POLICY "Admins can update jobs" ON jobs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can delete jobs
CREATE POLICY "Admins can delete jobs" ON jobs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
