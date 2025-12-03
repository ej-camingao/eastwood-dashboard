-- Migration: Add Gender and DGroup fields to attendees table
-- Run this script in your Supabase SQL Editor after the initial schema

-- Add gender column (TEXT, required, check constraint for Male/Female)
ALTER TABLE attendees
ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'Male'
CHECK (gender IN ('Male', 'Female'));

-- Add is_dgroup_member column (BOOLEAN, required)
ALTER TABLE attendees
ADD COLUMN IF NOT EXISTS is_dgroup_member BOOLEAN NOT NULL DEFAULT false;

-- Add dgroup_leader_name column (TEXT, optional)
ALTER TABLE attendees
ADD COLUMN IF NOT EXISTS dgroup_leader_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN attendees.gender IS 'Gender of the attendee: Male or Female';
COMMENT ON COLUMN attendees.is_dgroup_member IS 'Whether the attendee is a member of a DGroup';
COMMENT ON COLUMN attendees.dgroup_leader_name IS 'Name of the DGroup leader (required if is_dgroup_member is true)';

