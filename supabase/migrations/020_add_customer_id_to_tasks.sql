-- Add direct customer_id to tasks table so tasks can be linked to customers
-- without requiring a job intermediary

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
