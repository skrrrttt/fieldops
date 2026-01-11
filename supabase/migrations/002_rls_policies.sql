-- FieldOps RLS Policies
-- Row Level Security for all tables

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admins can read all users
CREATE POLICY "Admins can read all users"
    ON users FOR SELECT
    USING (is_admin());

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Admins can insert users
CREATE POLICY "Admins can insert users"
    ON users FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update all users
CREATE POLICY "Admins can update users"
    ON users FOR UPDATE
    USING (is_admin());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Admins can delete users
CREATE POLICY "Admins can delete users"
    ON users FOR DELETE
    USING (is_admin());

-- ============================================
-- DIVISIONS TABLE
-- ============================================
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read divisions
CREATE POLICY "All users can read divisions"
    ON divisions FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admins can insert divisions
CREATE POLICY "Admins can insert divisions"
    ON divisions FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update divisions
CREATE POLICY "Admins can update divisions"
    ON divisions FOR UPDATE
    USING (is_admin());

-- Admins can delete divisions
CREATE POLICY "Admins can delete divisions"
    ON divisions FOR DELETE
    USING (is_admin());

-- ============================================
-- STATUSES TABLE
-- ============================================
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read statuses
CREATE POLICY "All users can read statuses"
    ON statuses FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admins can insert statuses
CREATE POLICY "Admins can insert statuses"
    ON statuses FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update statuses
CREATE POLICY "Admins can update statuses"
    ON statuses FOR UPDATE
    USING (is_admin());

-- Admins can delete statuses
CREATE POLICY "Admins can delete statuses"
    ON statuses FOR DELETE
    USING (is_admin());

-- ============================================
-- TASKS TABLE
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tasks (not deleted)
CREATE POLICY "All users can read tasks"
    ON tasks FOR SELECT
    USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Admins can read all tasks including deleted
CREATE POLICY "Admins can read all tasks"
    ON tasks FOR SELECT
    USING (is_admin());

-- Admins can insert tasks
CREATE POLICY "Admins can insert tasks"
    ON tasks FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update all tasks
CREATE POLICY "Admins can update tasks"
    ON tasks FOR UPDATE
    USING (is_admin());

-- Field users can update task status only
CREATE POLICY "Field users can update task status"
    ON tasks FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND NOT is_admin()
        AND deleted_at IS NULL
    );

-- Admins can delete tasks
CREATE POLICY "Admins can delete tasks"
    ON tasks FOR DELETE
    USING (is_admin());

-- ============================================
-- COMMENTS TABLE
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read comments
CREATE POLICY "All users can read comments"
    ON comments FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert their own comments
CREATE POLICY "All users can insert own comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can insert comments for anyone
CREATE POLICY "Admins can insert comments"
    ON comments FOR INSERT
    WITH CHECK (is_admin());

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can update any comment
CREATE POLICY "Admins can update comments"
    ON comments FOR UPDATE
    USING (is_admin());

-- Admins can delete comments
CREATE POLICY "Admins can delete comments"
    ON comments FOR DELETE
    USING (is_admin());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- PHOTOS TABLE
-- ============================================
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read photos
CREATE POLICY "All users can read photos"
    ON photos FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert their own photos
CREATE POLICY "All users can insert own photos"
    ON photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can insert photos for anyone
CREATE POLICY "Admins can insert photos"
    ON photos FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update photos
CREATE POLICY "Admins can update photos"
    ON photos FOR UPDATE
    USING (is_admin());

-- Admins can delete photos
CREATE POLICY "Admins can delete photos"
    ON photos FOR DELETE
    USING (is_admin());

-- ============================================
-- FILES TABLE
-- ============================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read files
CREATE POLICY "All users can read files"
    ON files FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert their own files
CREATE POLICY "All users can insert own files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can insert files for anyone
CREATE POLICY "Admins can insert files"
    ON files FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update files
CREATE POLICY "Admins can update files"
    ON files FOR UPDATE
    USING (is_admin());

-- Admins can delete files
CREATE POLICY "Admins can delete files"
    ON files FOR DELETE
    USING (is_admin());

-- ============================================
-- CUSTOM_FIELD_DEFINITIONS TABLE
-- ============================================
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read custom field definitions
CREATE POLICY "All users can read custom field definitions"
    ON custom_field_definitions FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admins can insert custom field definitions
CREATE POLICY "Admins can insert custom field definitions"
    ON custom_field_definitions FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update custom field definitions
CREATE POLICY "Admins can update custom field definitions"
    ON custom_field_definitions FOR UPDATE
    USING (is_admin());

-- Admins can delete custom field definitions
CREATE POLICY "Admins can delete custom field definitions"
    ON custom_field_definitions FOR DELETE
    USING (is_admin());

-- ============================================
-- TASK_TEMPLATES TABLE
-- ============================================
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read task templates
CREATE POLICY "All users can read task templates"
    ON task_templates FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admins can insert task templates
CREATE POLICY "Admins can insert task templates"
    ON task_templates FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update task templates
CREATE POLICY "Admins can update task templates"
    ON task_templates FOR UPDATE
    USING (is_admin());

-- Admins can delete task templates
CREATE POLICY "Admins can delete task templates"
    ON task_templates FOR DELETE
    USING (is_admin());

-- ============================================
-- BRANDING TABLE
-- ============================================
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read branding
CREATE POLICY "All users can read branding"
    ON branding FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admins can insert branding
CREATE POLICY "Admins can insert branding"
    ON branding FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update branding
CREATE POLICY "Admins can update branding"
    ON branding FOR UPDATE
    USING (is_admin());

-- Admins can delete branding
CREATE POLICY "Admins can delete branding"
    ON branding FOR DELETE
    USING (is_admin());
