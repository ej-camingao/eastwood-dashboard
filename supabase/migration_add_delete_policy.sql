-- Migration: Add DELETE policy for attendance_log table
-- Run this script in your Supabase SQL Editor to allow removing check-ins

-- Allow anonymous users to delete from attendance_log (for removing check-ins)
CREATE POLICY "Allow anonymous delete on attendance_log"
ON attendance_log FOR DELETE
TO anon
USING (true);

