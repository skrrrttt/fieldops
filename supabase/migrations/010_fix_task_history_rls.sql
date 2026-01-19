-- Fix: Allow the archive trigger to insert into task_history
-- The trigger runs in user context, so we need to either:
-- 1. Add an INSERT policy, or
-- 2. Make the trigger function SECURITY DEFINER (runs as owner, bypasses RLS)

-- Option 2 is cleaner - recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION archive_completed_task()
RETURNS TRIGGER
SECURITY DEFINER  -- This makes it run as the function owner, bypassing RLS
SET search_path = public
AS $$
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
            NEW.assigned_user_id,
            v_duration,
            v_photos_count,
            v_comments_count,
            v_files_count
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
