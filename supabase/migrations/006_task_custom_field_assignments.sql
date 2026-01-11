-- Task Custom Field Assignments
-- Allows assigning specific custom fields to individual tasks

-- Add column to store which custom field IDs are assigned to this task
-- If NULL or empty, no custom fields are shown for this task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_field_ids TEXT[] DEFAULT '{}';

-- Add index for querying tasks by assigned fields
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_field_ids ON tasks USING GIN (assigned_field_ids);
