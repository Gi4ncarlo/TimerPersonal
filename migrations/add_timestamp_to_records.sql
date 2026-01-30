-- Migration: Add timestamp column to daily_records table
-- This allows tracking the exact time when an activity was registered

-- Add timestamp column (using created_at as default for existing records)
ALTER TABLE daily_records 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;

-- Update existing records to use created_at as timestamp if they don't have one
UPDATE daily_records 
SET timestamp = created_at 
WHERE timestamp IS NULL AND created_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN daily_records.timestamp IS 'Exact time when the activity was registered (in ISO format with timezone)';
