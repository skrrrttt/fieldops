-- FieldOps Storage Buckets
-- Creates storage buckets for photos and files

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================

-- Create photos bucket (public for viewing, authenticated for upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Create files bucket (public for viewing, authenticated for upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'files',
    'files',
    true,
    26214400, -- 25MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PHOTOS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Allow authenticated users to read photos
CREATE POLICY "Authenticated users can read photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'photos');

-- Allow public to read photos (for sharing)
CREATE POLICY "Public can read photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Allow admins to delete photos
CREATE POLICY "Admins can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'photos'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ============================================
-- FILES BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- Allow public to read files (for sharing)
CREATE POLICY "Public can read files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- Allow admins to delete files
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'files'
    AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
