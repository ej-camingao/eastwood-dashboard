-- Add how attendees heard about ELEVATE (first-timer registration)
ALTER TABLE attendees
  ADD COLUMN IF NOT EXISTS heard_about_elevate TEXT
    CHECK (
      heard_about_elevate IS NULL
      OR heard_about_elevate IN ('Facebook', 'Friend', 'Family', 'Instagram', 'Others')
    );
