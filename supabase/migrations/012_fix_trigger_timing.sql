-- Fix: Change trigger to BEFORE UPDATE so we can modify the row
-- AFTER UPDATE triggers can't modify the row being updated

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_task_complete ON tasks;

-- Recreate as BEFORE UPDATE trigger
CREATE TRIGGER on_task_complete
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION archive_completed_task();
