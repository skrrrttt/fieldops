-- Migration: Remove task templates feature
-- This cleans up after replacing templates with the Customer/Job CRM

-- Remove template_id column from tasks table if it exists
ALTER TABLE tasks DROP COLUMN IF EXISTS template_id;

-- Remove template_id column from task_history table if it exists
ALTER TABLE task_history DROP COLUMN IF EXISTS template_id;

-- Drop the task_templates table if it exists
DROP TABLE IF EXISTS task_templates;
