-- Fix RLS performance issues identified by Supabase advisor
-- 1. Use (select auth.uid()) instead of auth.uid() to prevent per-row evaluation
-- 2. Consolidate multiple permissive policies into single policies
-- 3. Add missing index for foreign key

-- ============================================
-- Add missing index for task_history.completed_by
-- ============================================
CREATE INDEX IF NOT EXISTS idx_task_history_completed_by ON task_history(completed_by);

-- ============================================
-- Fix checklists RLS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage checklists" ON checklists;
DROP POLICY IF EXISTS "Users can read checklists" ON checklists;

-- Consolidated policy: Admins can do everything, all authenticated users can read
CREATE POLICY "Authenticated users can read checklists" ON checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()))
  );

CREATE POLICY "Admins can insert checklists" ON checklists
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can update checklists" ON checklists
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can delete checklists" ON checklists
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ============================================
-- Fix checklist_items RLS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage checklist items" ON checklist_items;
DROP POLICY IF EXISTS "Users can read checklist items" ON checklist_items;

-- Consolidated policy: Admins can do everything, all authenticated users can read
CREATE POLICY "Authenticated users can read checklist items" ON checklist_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()))
  );

CREATE POLICY "Admins can insert checklist items" ON checklist_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can update checklist items" ON checklist_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can delete checklist items" ON checklist_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ============================================
-- Fix task_checklists RLS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can manage task checklists" ON task_checklists;
DROP POLICY IF EXISTS "Users can read task checklists" ON task_checklists;
DROP POLICY IF EXISTS "Users can update task checklist completions" ON task_checklists;

-- Consolidated policies with (select auth.uid()) optimization
CREATE POLICY "Authenticated users can read task checklists" ON task_checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()))
  );

CREATE POLICY "Admins can insert task checklists" ON task_checklists
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- All authenticated users can update (for checking off items), admins can update anything
CREATE POLICY "Authenticated users can update task checklists" ON task_checklists
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()))
  );

CREATE POLICY "Admins can delete task checklists" ON task_checklists
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ============================================
-- Fix task_history RLS policies
-- ============================================
DROP POLICY IF EXISTS "Admins can view all task history" ON task_history;
DROP POLICY IF EXISTS "Field users can view their completed tasks" ON task_history;
DROP POLICY IF EXISTS "Admins can delete task history" ON task_history;

-- Consolidated SELECT policy: admins see all, field users see their own
CREATE POLICY "Users can view task history" ON task_history
  FOR SELECT USING (
    (select auth.uid()) = assigned_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can insert task history" ON task_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can delete task history" ON task_history
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );
