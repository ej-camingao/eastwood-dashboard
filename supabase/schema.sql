-- Elevate Saturday Service Database Schema
-- Run this script in your Supabase SQL Editor

-- Create facilitators table
CREATE TABLE IF NOT EXISTS facilitators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    is_facilitating BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create attendees table
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    contact_number TEXT UNIQUE NOT NULL,
    email TEXT,
    birthday DATE,
    school_name TEXT NOT NULL,
    barangay TEXT NOT NULL,
    city TEXT NOT NULL,
    social_media_name TEXT,
    gender TEXT NOT NULL DEFAULT 'Male' CHECK (gender IN ('Male', 'Female')),
    is_dgroup_member BOOLEAN NOT NULL DEFAULT false,
    dgroup_leader_name TEXT,
    is_first_timer BOOLEAN DEFAULT FALSE NOT NULL,
    heard_about_elevate TEXT CHECK (
        heard_about_elevate IS NULL
        OR heard_about_elevate IN ('Facebook', 'Friend', 'Family', 'Instagram', 'Others')
    ),
    facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL,
    default_facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create b1g_attendees table (B1G Eastwood ministry)
CREATE TABLE IF NOT EXISTS b1g_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birthdate DATE NOT NULL,
    contact_number TEXT NOT NULL,
    social_media_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create attendance_log table (shared across ministries; ministry discriminator + XOR FK)
CREATE TABLE IF NOT EXISTS attendance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id UUID REFERENCES attendees(id) ON DELETE CASCADE,
    b1g_attendee_id UUID REFERENCES b1g_attendees(id) ON DELETE CASCADE,
    ministry TEXT NOT NULL DEFAULT 'elevate' CHECK (ministry IN ('elevate', 'b1g')),
    service_date DATE NOT NULL DEFAULT current_date,
    check_in_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    facilitator_id UUID REFERENCES facilitators(id) ON DELETE SET NULL,
    CONSTRAINT attendance_log_person_xor CHECK (
        (attendee_id IS NOT NULL AND b1g_attendee_id IS NULL)
        OR (attendee_id IS NULL AND b1g_attendee_id IS NOT NULL)
    )
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_facilitators_gender ON facilitators(gender);
CREATE INDEX IF NOT EXISTS idx_facilitators_name ON facilitators(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_facilitators_is_facilitating ON facilitators(is_facilitating);
CREATE INDEX IF NOT EXISTS idx_attendees_first_name ON attendees(first_name);
CREATE INDEX IF NOT EXISTS idx_attendees_last_name ON attendees(last_name);
CREATE INDEX IF NOT EXISTS idx_attendees_contact_number ON attendees(contact_number);
CREATE INDEX IF NOT EXISTS idx_attendees_full_name ON attendees(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_attendees_facilitator_id ON attendees(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_attendees_default_facilitator_id ON attendees(default_facilitator_id);

-- Indexes for b1g_attendees lookups
CREATE INDEX IF NOT EXISTS idx_b1g_first_name ON b1g_attendees(first_name);
CREATE INDEX IF NOT EXISTS idx_b1g_last_name ON b1g_attendees(last_name);
CREATE INDEX IF NOT EXISTS idx_b1g_full_name ON b1g_attendees(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_b1g_contact_number ON b1g_attendees(contact_number);

-- Create index for attendance_log lookups
CREATE INDEX IF NOT EXISTS idx_attendance_log_attendee_id ON attendance_log(attendee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_log_b1g_attendee_id ON attendance_log(b1g_attendee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_log_ministry ON attendance_log(ministry);
CREATE INDEX IF NOT EXISTS idx_attendance_log_service_date ON attendance_log(service_date);
CREATE INDEX IF NOT EXISTS idx_attendance_log_facilitator_id ON attendance_log(facilitator_id);

-- Partial unique indexes: one check-in per person per ministry per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_elevate_per_day
    ON attendance_log(attendee_id, service_date) WHERE attendee_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_b1g_per_day
    ON attendance_log(b1g_attendee_id, service_date) WHERE b1g_attendee_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE facilitators IS 'Stores information about facilitators for breakout groups';
COMMENT ON TABLE attendees IS 'Stores information about all attendees registered for Elevate Saturday Service';
COMMENT ON TABLE attendance_log IS 'Tracks attendance records for each service date';
COMMENT ON COLUMN facilitators.gender IS 'Gender of the facilitator: Male or Female';
COMMENT ON COLUMN facilitators.is_facilitating IS 'Whether the facilitator is actively facilitating. If false, they will not appear in the facilitator tab but will be treated as a regular attendee.';
COMMENT ON COLUMN attendees.contact_number IS 'Unique contact number in format +639xxxxxxxxx';
COMMENT ON COLUMN attendees.gender IS 'Gender of the attendee: Male or Female';
COMMENT ON COLUMN attendees.is_dgroup_member IS 'Whether the attendee is a member of a DGroup';
COMMENT ON COLUMN attendees.dgroup_leader_name IS 'Name of the DGroup leader (required if is_dgroup_member is true)';
COMMENT ON COLUMN attendees.facilitator_id IS 'Reference to the facilitator assigned to this attendee';
COMMENT ON COLUMN attendees.default_facilitator_id IS 'Default/preferred facilitator for this attendee (manually set in Supabase, never updated by application)';
COMMENT ON COLUMN attendance_log.service_date IS 'Date of the service, defaults to current_date';
COMMENT ON COLUMN attendance_log.facilitator_id IS 'Facilitator assigned to this attendee for this specific service date';
COMMENT ON COLUMN attendance_log.ministry IS 'Ministry discriminator: elevate or b1g';
COMMENT ON COLUMN attendance_log.b1g_attendee_id IS 'FK to b1g_attendees when ministry = b1g; mutually exclusive with attendee_id';
COMMENT ON TABLE b1g_attendees IS 'Stores information about attendees registered for B1G Eastwood ministry';
COMMENT ON COLUMN b1g_attendees.birthdate IS 'Birth month and year; day is always 01 (YYYY-MM-01)';
COMMENT ON COLUMN b1g_attendees.contact_number IS 'Contact number in format +639xxxxxxxxx (not unique)';

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE facilitators ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE b1g_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;

-- B1G attendees policies (mirror attendees)
CREATE POLICY "Allow anonymous insert on b1g_attendees"
ON b1g_attendees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous select on b1g_attendees"
ON b1g_attendees FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous update on b1g_attendees"
ON b1g_attendees FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete on b1g_attendees"
ON b1g_attendees FOR DELETE TO anon USING (true);

-- Allow anonymous users to insert into attendees (for registration)
CREATE POLICY "Allow anonymous insert on attendees"
ON attendees FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to select from attendees (for search)
CREATE POLICY "Allow anonymous select on attendees"
ON attendees FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to insert into attendance_log (for check-in)
CREATE POLICY "Allow anonymous insert on attendance_log"
ON attendance_log FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to select from attendance_log (for checking existing check-ins)
CREATE POLICY "Allow anonymous select on attendance_log"
ON attendance_log FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to delete from attendance_log (for removing check-ins)
CREATE POLICY "Allow anonymous delete on attendance_log"
ON attendance_log FOR DELETE
TO anon
USING (true);

-- Facilitators RLS Policies
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

