-- Add first_name and last_name snapshot columns to attendance_log
-- Populated at check-in so attendance queries don't require joining attendees/b1g_attendees.

ALTER TABLE attendance_log
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN attendance_log.first_name IS 'Snapshot of attendee first name at check-in time';
COMMENT ON COLUMN attendance_log.last_name IS 'Snapshot of attendee last name at check-in time';
