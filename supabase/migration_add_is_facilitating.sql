-- Add is_facilitating column to facilitators table
-- This allows facilitators to opt out of facilitating while still being present as regular attendees

ALTER TABLE facilitators
ADD COLUMN IF NOT EXISTS is_facilitating BOOLEAN NOT NULL DEFAULT true;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_facilitators_is_facilitating ON facilitators(is_facilitating);

-- Add comment for documentation
COMMENT ON COLUMN facilitators.is_facilitating IS 'Whether the facilitator is actively facilitating. If false, they will not appear in the facilitator tab but will be treated as a regular attendee.';
