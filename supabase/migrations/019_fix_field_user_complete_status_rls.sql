-- Fix: Field users cannot mark tasks as complete
-- The issue: The "Field users can update task status" policy uses USING clause
-- for both row visibility AND the WITH CHECK (since no explicit WITH CHECK exists).
-- When the archive_completed_task trigger sets deleted_at = NOW() in a BEFORE UPDATE,
-- the implicit WITH CHECK fails because deleted_at IS no longer NULL.
-- Admins don't have this problem because their policy has no deleted_at check.
--
-- Fix: Add explicit WITH CHECK that doesn't restrict deleted_at on the new row.

DROP POLICY IF EXISTS "Field users can update task status" ON tasks;

CREATE POLICY "Field users can update task status"
    ON tasks FOR UPDATE
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND NOT is_admin()
        AND deleted_at IS NULL
    )
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND NOT is_admin()
    );
