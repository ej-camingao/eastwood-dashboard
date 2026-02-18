-- Migration: Make contact_number nullable and update unique constraint
-- This allows attendees without mobile numbers to register

-- Drop the existing unique constraint on contact_number
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_contact_number_key;

-- Make contact_number nullable
ALTER TABLE attendees ALTER COLUMN contact_number DROP NOT NULL;

-- Add a partial unique index that only applies to non-null contact numbers
-- This ensures uniqueness for contact numbers that exist, but allows multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS attendees_contact_number_unique_idx 
ON attendees(contact_number) 
WHERE contact_number IS NOT NULL;

-- Update the comment to reflect the change
COMMENT ON COLUMN attendees.contact_number IS 'Contact number in format +639xxxxxxxxx (optional, unique when provided)';
