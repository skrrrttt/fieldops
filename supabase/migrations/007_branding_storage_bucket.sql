-- Branding Storage Bucket
-- Creates storage bucket for branding assets (logos)

-- ============================================
-- CREATE BRANDING STORAGE BUCKET
-- ============================================

-- Create branding bucket (public for viewing, admin-only for upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding',
    'branding',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BRANDING BUCKET POLICIES
-- ============================================

-- Allow admins to upload branding assets
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'branding'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Allow admins to update branding assets
CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'branding'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Allow public to read branding assets (logos need to be visible to everyone)
CREATE POLICY "Public can read branding assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');

-- Allow admins to delete branding assets
CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'branding'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
