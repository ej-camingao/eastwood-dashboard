-- Migration: Add Facilitators table and facilitator_id to attendees
-- Run this script in your Supabase SQL Editor

-- Create facilitators table
CREATE TABLE IF NOT EXISTS facilitators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add facilitator_id column to attendees table
ALTER TABLE attendees
ADD COLUMN IF NOT EXISTS facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_facilitators_gender ON facilitators(gender);
CREATE INDEX IF NOT EXISTS idx_facilitators_name ON facilitators(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_attendees_facilitator_id ON attendees(facilitator_id);

-- Add comments for documentation
COMMENT ON TABLE facilitators IS 'Stores information about facilitators for breakout groups';
COMMENT ON COLUMN facilitators.gender IS 'Gender of the facilitator: Male or Female';
COMMENT ON COLUMN attendees.facilitator_id IS 'Reference to the facilitator assigned to this attendee';

-- Row Level Security (RLS) Policies for facilitators
ALTER TABLE facilitators ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to select from facilitators
CREATE POLICY "Allow anonymous select on facilitators"
ON facilitators FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to insert into facilitators
CREATE POLICY "Allow anonymous insert on facilitators"
ON facilitators FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to update facilitators
CREATE POLICY "Allow anonymous update on facilitators"
ON facilitators FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to delete from facilitators
CREATE POLICY "Allow anonymous delete on facilitators"
ON facilitators FOR DELETE
TO anon
USING (true);

-- Allow anonymous users to update attendees (for facilitator assignment)
CREATE POLICY "Allow anonymous update on attendees"
ON attendees FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

