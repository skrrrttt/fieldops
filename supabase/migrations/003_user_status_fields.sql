-- Add status fields to users table for user management
-- Migration: 003_user_status_fields

-- Add is_active column to track if user is activated/deactivated
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add last_active_at column to track last login/activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Create index on is_active for filtering queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
