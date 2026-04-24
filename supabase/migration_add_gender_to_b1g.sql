-- Add gender column to b1g_attendees for facilitator gender-matching
-- Nullable to preserve existing rows.

ALTER TABLE b1g_attendees
    ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('Male', 'Female'));

COMMENT ON COLUMN b1g_attendees.gender IS 'Male or Female; used for facilitator gender-matched auto-assignment';
