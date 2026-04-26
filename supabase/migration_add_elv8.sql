-- ELEVATE (ELV8) Ministry: new attendees table + extend shared attendance_log discriminator
-- Run after migration_add_b1g_eastwood.sql.

-- 1. New ELV8 attendees table
CREATE TABLE IF NOT EXISTS elv8_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthdate DATE NOT NULL,              -- stored as YYYY-MM-01 (day is synthetic)
    contact_number TEXT NOT NULL,         -- +639xxxxxxxxx, NOT unique
    social_media_name TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elv8_first_name ON elv8_attendees(first_name);
CREATE INDEX IF NOT EXISTS idx_elv8_last_name ON elv8_attendees(last_name);
CREATE INDEX IF NOT EXISTS idx_elv8_full_name ON elv8_attendees(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_elv8_contact_number ON elv8_attendees(contact_number);

COMMENT ON TABLE elv8_attendees IS 'Stores information about attendees registered for ELEVATE (ELV8) ministry';
COMMENT ON COLUMN elv8_attendees.birthdate IS 'Birth month and year; day is always 01 (YYYY-MM-01)';
COMMENT ON COLUMN elv8_attendees.contact_number IS 'Contact number in format +639xxxxxxxxx (not unique)';

-- 2. Extend attendance_log ministry CHECK to include 'elv8' and add elv8_attendee_id FK
ALTER TABLE attendance_log
    DROP CONSTRAINT IF EXISTS attendance_log_ministry_check;

ALTER TABLE attendance_log
    DROP CONSTRAINT IF EXISTS attendance_log_ministry_check1;

-- Drop any existing CHECK on ministry by re-adding a named one (Postgres auto-names old ones)
DO $$
DECLARE
    cons_name TEXT;
BEGIN
    FOR cons_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'attendance_log'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%ministry%'
    LOOP
        EXECUTE format('ALTER TABLE attendance_log DROP CONSTRAINT %I', cons_name);
    END LOOP;
END $$;

ALTER TABLE attendance_log
    ADD CONSTRAINT attendance_log_ministry_check
    CHECK (ministry IN ('elevate', 'b1g', 'elv8'));

ALTER TABLE attendance_log
    ADD COLUMN IF NOT EXISTS elv8_attendee_id UUID REFERENCES elv8_attendees(id) ON DELETE CASCADE;

-- 3. Update XOR constraint to allow exactly one of the three FKs
ALTER TABLE attendance_log
    DROP CONSTRAINT IF EXISTS attendance_log_person_xor;

ALTER TABLE attendance_log
    ADD CONSTRAINT attendance_log_person_xor CHECK (
        (
            (CASE WHEN attendee_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN b1g_attendee_id IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN elv8_attendee_id IS NOT NULL THEN 1 ELSE 0 END)
        ) = 1
    );

-- 4. Partial unique index for ELV8 per-day check-ins
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_elv8_per_day
    ON attendance_log(elv8_attendee_id, service_date) WHERE elv8_attendee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_log_elv8_attendee_id ON attendance_log(elv8_attendee_id);

COMMENT ON COLUMN attendance_log.ministry IS 'Ministry discriminator: elevate, b1g, or elv8';
COMMENT ON COLUMN attendance_log.elv8_attendee_id IS 'FK to elv8_attendees when ministry = elv8; mutually exclusive with attendee_id and b1g_attendee_id';

-- 5. RLS for elv8_attendees (mirrors b1g_attendees policies)
ALTER TABLE elv8_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert on elv8_attendees" ON elv8_attendees;
CREATE POLICY "Allow anonymous insert on elv8_attendees"
ON elv8_attendees FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select on elv8_attendees" ON elv8_attendees;
CREATE POLICY "Allow anonymous select on elv8_attendees"
ON elv8_attendees FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anonymous update on elv8_attendees" ON elv8_attendees;
CREATE POLICY "Allow anonymous update on elv8_attendees"
ON elv8_attendees FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete on elv8_attendees" ON elv8_attendees;
CREATE POLICY "Allow anonymous delete on elv8_attendees"
ON elv8_attendees FOR DELETE
TO anon
USING (true);
