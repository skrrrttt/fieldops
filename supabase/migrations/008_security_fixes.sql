-- Security Fixes Migration
-- Addresses security issues identified in security evaluation

-- ============================================
-- FIX 1: Function Search Path Mutable
-- Set search_path on functions to prevent search path hijacking
-- ============================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix is_admin function with secure search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================
-- FIX 2: Add Missing Foreign Key Indexes
-- Improves JOIN and DELETE performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_default_division_id ON task_templates(default_division_id);

-- ============================================
-- FIX 3: Optimize RLS Policies
-- Wrap auth.uid() in (SELECT ...) to prevent per-row re-evaluation
-- ============================================

-- Drop and recreate users policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING ((SELECT auth.uid()) = id);

-- Optimize divisions policy
DROP POLICY IF EXISTS "All users can read divisions" ON divisions;
CREATE POLICY "All users can read divisions"
    ON divisions FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize statuses policy
DROP POLICY IF EXISTS "All users can read statuses" ON statuses;
CREATE POLICY "All users can read statuses"
    ON statuses FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize tasks policies
DROP POLICY IF EXISTS "All users can read tasks" ON tasks;
CREATE POLICY "All users can read tasks"
    ON tasks FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Field users can update task status" ON tasks;
CREATE POLICY "Field users can update task status"
    ON tasks FOR UPDATE
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND NOT is_admin()
        AND deleted_at IS NULL
    );

-- Optimize comments policies
DROP POLICY IF EXISTS "All users can read comments" ON comments;
CREATE POLICY "All users can read comments"
    ON comments FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "All users can insert own comments" ON comments;
CREATE POLICY "All users can insert own comments"
    ON comments FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- Optimize photos policies
DROP POLICY IF EXISTS "All users can read photos" ON photos;
CREATE POLICY "All users can read photos"
    ON photos FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "All users can insert own photos" ON photos;
CREATE POLICY "All users can insert own photos"
    ON photos FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Optimize files policies
DROP POLICY IF EXISTS "All users can read files" ON files;
CREATE POLICY "All users can read files"
    ON files FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "All users can insert own files" ON files;
CREATE POLICY "All users can insert own files"
    ON files FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Optimize custom_field_definitions policy
DROP POLICY IF EXISTS "All users can read custom field definitions" ON custom_field_definitions;
CREATE POLICY "All users can read custom field definitions"
    ON custom_field_definitions FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize task_templates policy
DROP POLICY IF EXISTS "All users can read task templates" ON task_templates;
CREATE POLICY "All users can read task templates"
    ON task_templates FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

-- Optimize branding policy
DROP POLICY IF EXISTS "All users can read branding" ON branding;
CREATE POLICY "All users can read branding"
    ON branding FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);
