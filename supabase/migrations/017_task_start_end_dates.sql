-- Migration: Replace due_date with start_date and end_date
-- This allows tasks to have a work window (when work begins and when it must be completed)

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN start_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN end_date TIMESTAMPTZ;

-- Migrate existing due_date data to end_date (existing due dates become end dates)
UPDATE tasks SET end_date = due_date WHERE due_date IS NOT NULL;

-- Drop old column and its index
DROP INDEX IF EXISTS idx_tasks_due_date;
ALTER TABLE tasks DROP COLUMN due_date;

-- Create new indexes for the date columns
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_end_date ON tasks(end_date);

-- Also update task_history table to track these fields
ALTER TABLE task_history ADD COLUMN start_date TIMESTAMPTZ;
ALTER TABLE task_history ADD COLUMN end_date TIMESTAMPTZ;

-- Migrate existing due_date data in task_history
UPDATE task_history SET end_date = due_date WHERE due_date IS NOT NULL;

-- Drop the old column from task_history
ALTER TABLE task_history DROP COLUMN due_date;
