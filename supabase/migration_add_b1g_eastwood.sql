-- B1G Eastwood Ministry: new attendees table + shared attendance_log discriminator
-- Run after existing schema.sql and prior migrations.

-- 1. New B1G attendees table
CREATE TABLE IF NOT EXISTS b1g_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthdate DATE NOT NULL,              -- stored as YYYY-MM-01 (day is synthetic)
    contact_number TEXT NOT NULL,         -- +639xxxxxxxxx, NOT unique
    social_media_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_b1g_first_name ON b1g_attendees(first_name);
CREATE INDEX IF NOT EXISTS idx_b1g_last_name ON b1g_attendees(last_name);
CREATE INDEX IF NOT EXISTS idx_b1g_full_name ON b1g_attendees(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_b1g_contact_number ON b1g_attendees(contact_number);

COMMENT ON TABLE b1g_attendees IS 'Stores information about attendees registered for B1G Eastwood ministry';
COMMENT ON COLUMN b1g_attendees.birthdate IS 'Birth month and year; day is always 01 (YYYY-MM-01)';
COMMENT ON COLUMN b1g_attendees.contact_number IS 'Contact number in format +639xxxxxxxxx (not unique)';

-- 2. Extend attendance_log with ministry discriminator + b1g_attendee_id
ALTER TABLE attendance_log
    ADD COLUMN IF NOT EXISTS ministry TEXT NOT NULL DEFAULT 'elevate'
        CHECK (ministry IN ('elevate', 'b1g'));

ALTER TABLE attendance_log
    ADD COLUMN IF NOT EXISTS b1g_attendee_id UUID REFERENCES b1g_attendees(id) ON DELETE CASCADE;

-- 3. Relax attendee_id NOT NULL and enforce XOR (exactly one of the two FKs must be set)
ALTER TABLE attendance_log
    ALTER COLUMN attendee_id DROP NOT NULL;

ALTER TABLE attendance_log
    DROP CONSTRAINT IF EXISTS attendance_log_person_xor;

ALTER TABLE attendance_log
    ADD CONSTRAINT attendance_log_person_xor CHECK (
        (attendee_id IS NOT NULL AND b1g_attendee_id IS NULL)
        OR (attendee_id IS NULL AND b1g_attendee_id IS NOT NULL)
    );

-- 4. Replace old unique constraint with ministry-aware partial unique indexes
ALTER TABLE attendance_log DROP CONSTRAINT IF EXISTS attendance_log_attendee_id_service_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_elevate_per_day
    ON attendance_log(attendee_id, service_date) WHERE attendee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_b1g_per_day
    ON attendance_log(b1g_attendee_id, service_date) WHERE b1g_attendee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_log_b1g_attendee_id ON attendance_log(b1g_attendee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_log_ministry ON attendance_log(ministry);

COMMENT ON COLUMN attendance_log.ministry IS 'Ministry discriminator: elevate or b1g';
COMMENT ON COLUMN attendance_log.b1g_attendee_id IS 'FK to b1g_attendees when ministry = b1g; mutually exclusive with attendee_id';

-- 5. RLS for b1g_attendees (mirrors attendees policies: anon read/write for this app)
ALTER TABLE b1g_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert on b1g_attendees" ON b1g_attendees;
CREATE POLICY "Allow anonymous insert on b1g_attendees"
ON b1g_attendees FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select on b1g_attendees" ON b1g_attendees;
CREATE POLICY "Allow anonymous select on b1g_attendees"
ON b1g_attendees FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anonymous update on b1g_attendees" ON b1g_attendees;
CREATE POLICY "Allow anonymous update on b1g_attendees"
ON b1g_attendees FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete on b1g_attendees" ON b1g_attendees;
CREATE POLICY "Allow anonymous delete on b1g_attendees"
ON b1g_attendees FOR DELETE
TO anon
USING (true);
