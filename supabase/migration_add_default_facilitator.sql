-- Migration: Add default_facilitator_id to attendees and facilitator_id to attendance_log
-- Run this script in your Supabase SQL Editor

-- Add default_facilitator_id column to attendees table
ALTER TABLE attendees
ADD COLUMN IF NOT EXISTS default_facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL;

-- Add facilitator_id column to attendance_log table
ALTER TABLE attendance_log
ADD COLUMN IF NOT EXISTS facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_attendees_default_facilitator_id ON attendees(default_facilitator_id);
CREATE INDEX IF NOT EXISTS idx_attendance_log_facilitator_id ON attendance_log(facilitator_id);

-- Add comments for documentation
COMMENT ON COLUMN attendees.default_facilitator_id IS 'Default/preferred facilitator for this attendee (manually set in Supabase, never updated by application)';
COMMENT ON COLUMN attendance_log.facilitator_id IS 'Facilitator assigned to this attendee for this specific service date';

-- Allow anonymous users to update attendance_log (for facilitator assignment per service)
CREATE POLICY "Allow anonymous update on attendance_log"
ON attendance_log FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

