-- Task History & Recurring Tasks Schema
-- Migration 009: Add task history for completed tasks and recurring task support

-- =============================================================================
-- PART 1: Add template_id to tasks (links task to source template)
-- =============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS specifications TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_id);

-- =============================================================================
-- PART 2: Extend task_templates for recurring tasks
-- =============================================================================

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_generation_at TIMESTAMPTZ;

-- Index for finding templates due for generation
CREATE INDEX IF NOT EXISTS idx_task_templates_next_generation
ON task_templates(next_generation_at)
WHERE is_active = TRUE AND recurrence_rule IS NOT NULL;

-- =============================================================================
-- PART 3: Task History table for completed task archival
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Original task reference
    original_task_id UUID NOT NULL,
    template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,

    -- Denormalized task data (frozen at completion time)
    title TEXT NOT NULL,
    description TEXT,
    specifications TEXT,

    -- Denormalized relationship names (for querying without joins)
    status_name TEXT NOT NULL,
    status_color TEXT,
    division_name TEXT,
    division_color TEXT,
    assigned_user_id UUID,
    assigned_user_email TEXT,

    -- Location data
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    address TEXT,

    -- Custom fields snapshot
    custom_fields JSONB,

    -- Timing information
    due_date TIMESTAMPTZ,
    task_created_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Calculated metrics
    duration_minutes INTEGER,  -- time from task creation to completion

    -- Attachment counts (denormalized for quick stats)
    photos_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    files_count INTEGER DEFAULT 0,

    -- Archive metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_history_template ON task_history(template_id);
CREATE INDEX IF NOT EXISTS idx_task_history_completed_at ON task_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_history_division ON task_history(division_name);
CREATE INDEX IF NOT EXISTS idx_task_history_assigned_user ON task_history(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_original_task ON task_history(original_task_id);

-- =============================================================================
-- PART 4: Trigger to archive task when marked complete
-- =============================================================================

CREATE OR REPLACE FUNCTION archive_completed_task()
RETURNS TRIGGER AS $$
DECLARE
    v_status_complete BOOLEAN;
    v_old_status_complete BOOLEAN;
    v_status_name TEXT;
    v_status_color TEXT;
    v_division_name TEXT;
    v_division_color TEXT;
    v_user_email TEXT;
    v_photos_count INTEGER;
    v_comments_count INTEGER;
    v_files_count INTEGER;
    v_duration INTEGER;
BEGIN
    -- Check if the new status is a completion status
    SELECT is_complete, name, color INTO v_status_complete, v_status_name, v_status_color
    FROM statuses WHERE id = NEW.status_id;

    -- Check if the old status was already complete (avoid re-archiving)
    SELECT is_complete INTO v_old_status_complete
    FROM statuses WHERE id = OLD.status_id;

    -- Only archive if transitioning TO complete status
    IF v_status_complete = TRUE AND (v_old_status_complete IS NULL OR v_old_status_complete = FALSE) THEN

        -- Get division info
        IF NEW.division_id IS NOT NULL THEN
            SELECT name, color INTO v_division_name, v_division_color
            FROM divisions WHERE id = NEW.division_id;
        END IF;

        -- Get assigned user email
        IF NEW.assigned_user_id IS NOT NULL THEN
            SELECT email INTO v_user_email
            FROM users WHERE id = NEW.assigned_user_id;
        END IF;

        -- Count attachments
        SELECT COUNT(*) INTO v_photos_count FROM photos WHERE task_id = NEW.id;
        SELECT COUNT(*) INTO v_comments_count FROM comments WHERE task_id = NEW.id;
        SELECT COUNT(*) INTO v_files_count FROM files WHERE task_id = NEW.id;

        -- Calculate duration in minutes
        v_duration := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60;

        -- Insert into history
        INSERT INTO task_history (
            original_task_id,
            template_id,
            title,
            description,
            specifications,
            status_name,
            status_color,
            division_name,
            division_color,
            assigned_user_id,
            assigned_user_email,
            location_lat,
            location_lng,
            address,
            custom_fields,
            due_date,
            task_created_at,
            completed_at,
            completed_by,
            duration_minutes,
            photos_count,
            comments_count,
            files_count
        ) VALUES (
            NEW.id,
            NEW.template_id,
            NEW.title,
            NEW.description,
            NEW.specifications,
            v_status_name,
            v_status_color,
            v_division_name,
            v_division_color,
            NEW.assigned_user_id,
            v_user_email,
            NEW.location_lat,
            NEW.location_lng,
            NEW.address,
            NEW.custom_fields,
            NEW.due_date,
            NEW.created_at,
            NOW(),
            NEW.assigned_user_id,  -- completed_by defaults to assigned user
            v_duration,
            v_photos_count,
            v_comments_count,
            v_files_count
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS on_task_complete ON tasks;
CREATE TRIGGER on_task_complete
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION archive_completed_task();

-- =============================================================================
-- PART 5: RLS Policies for task_history
-- =============================================================================

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all history
CREATE POLICY "Admins can view all task history"
ON task_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Field users can view history for tasks they completed
CREATE POLICY "Field users can view their completed tasks"
ON task_history
FOR SELECT
TO authenticated
USING (
    completed_by = auth.uid()
    OR assigned_user_id = auth.uid()
);

-- Only system (via trigger) can insert - no direct inserts
-- Admins can delete history if needed
CREATE POLICY "Admins can delete task history"
ON task_history
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);
