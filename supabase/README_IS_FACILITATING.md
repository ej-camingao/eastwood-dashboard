# is_facilitating Feature

## Overview
The `is_facilitating` column allows facilitators to opt out of facilitating while still being present as regular attendees. When a facilitator sets `is_facilitating` to `false`, they will:

- Not appear in the Facilitator Tab
- Not be assigned any attendees
- Be treated as a regular attendee in the system

## Migration

Run the migration file to add the column to your existing database:

```sql
-- File: supabase/migration_add_is_facilitating.sql
ALTER TABLE facilitators
ADD COLUMN IF NOT EXISTS is_facilitating BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_facilitators_is_facilitating ON facilitators(is_facilitating);

COMMENT ON COLUMN facilitators.is_facilitating IS 'Whether the facilitator is actively facilitating. If false, they will not appear in the facilitator tab but will be treated as a regular attendee.';
```

## Usage

### In Supabase Table Editor

1. Open the `facilitators` table in Supabase
2. Find the facilitator who doesn't want to facilitate
3. Set their `is_facilitating` column to `false`
4. The facilitator will immediately stop appearing in the Facilitator Tab
5. They can still check in as a regular attendee

### Behavior

- **is_facilitating = true** (default): Facilitator appears in the Facilitator Tab and can be assigned attendees
- **is_facilitating = false**: Facilitator is hidden from the Facilitator Tab and treated as a regular attendee

### Important Notes

- The change takes effect immediately
- Existing attendee assignments are not affected when you set `is_facilitating` to `false`
- When set back to `true`, the facilitator will appear in the Facilitator Tab again
- The facilitator can still check in regardless of their `is_facilitating` status
