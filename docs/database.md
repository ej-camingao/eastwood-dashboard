# Database

Postgres is hosted on Supabase. The app uses the anon key. SQL in `supabase/` is the source of truth for tables and policies. TypeScript mirrors it in `src/lib/types/database.types.ts`.

## Apply order

`schema.sql` is the only script that creates the original `attendees` and `attendance_log` tables. The migrations alter those tables; they are not a bootstrap by themselves.

On a **new** project:

1. Run `supabase/schema.sql`.
2. Run the five scripts below, in order.

`schema.sql` already includes facilitators, Elevate profile fields (gender, DGroup, heard-about), default-facilitator columns, B1G (still a two-person check), `is_facilitating`, and delete on `attendance_log`. It does not include the rows in this table.

| Order | File | Adds |
| ----- | ---- | ---- |
| 1 | `migration_add_default_facilitator.sql` | **Allow anonymous update on attendance_log**. Columns and indexes in this file are already in `schema.sql` (`ADD COLUMN IF NOT EXISTS`). The policy is not, and transfers fail without it. `CREATE POLICY` has no `DROP POLICY`, so skip this file when that policy already exists. |
| 2 | `migration_add_elv8.sql` | `elv8_attendees`, `attendance_log.elv8_attendee_id`, ministry value `elv8`, three-way person check, ELV8 policies |
| 3 | `migration_add_names_to_attendance_log.sql` | `attendance_log.first_name`, `attendance_log.last_name` |
| 4 | `migration_add_gender_to_b1g.sql` | `b1g_attendees.gender` |
| 5 | `migration_make_contact_number_nullable.sql` | Nullable Elevate `contact_number` and a partial unique index |

`migration_add_elv8.sql` replaces the two-person check from `schema.sql`. Run it before treating the database as current.

On an **existing** project, run only the scripts not yet applied. The remaining `migration_*.sql` files (`facilitators`, gender/DGroup, heard-about, B1G core, `is_facilitating`, attendance delete) match objects already created in `schema.sql`. Several of them `CREATE POLICY` without `DROP POLICY IF EXISTS`, so running them again on a database that already has those policies will error.

## Tables

### `facilitators`

People who can hold a breakout group.

| Column | Notes |
| ------ | ----- |
| `id` | UUID primary key. Promotion reuses the Elevate or B1G attendee id. |
| `first_name`, `last_name` | Required |
| `gender` | `Male` or `Female` |
| `is_facilitating` | Default `true`. `false` hides them from the Facilitators tab. |
| `created_at` | `now()` |

### `attendees`

Elevate Eastwood people.

| Column | Notes |
| ------ | ----- |
| `id` | UUID |
| `first_name`, `last_name` | Required |
| `contact_number` | Nullable after the contact migration. Unique when not null (`attendees_contact_number_unique_idx`). |
| `email`, `social_media_name` | Optional |
| `birthday` | Date, optional in the database; the live form requires it |
| `school_name`, `barangay`, `city` | Required |
| `gender` | `Male` or `Female`, default `Male` |
| `is_dgroup_member` | Default `false` |
| `dgroup_leader_name` | Optional; the app sets it when they are a DGroup member |
| `is_first_timer` | Set `true` on registration |
| `heard_about_elevate` | `Facebook`, `Friend`, `Family`, `Instagram`, `Others`, or null |
| `facilitator_id` | FK to `facilitators`, `ON DELETE SET NULL`. Updated on Elevate assign/transfer. |
| `default_facilitator_id` | FK to `facilitators`. Manual override used by auto-assign. |
| `created_at` | `now()` |

### `b1g_attendees`

B1G Eastwood people. Contact number is required and not unique. `birthdate` stores year-month as `YYYY-MM-01`. `gender` is optional (`Male` or `Female`). The current B1G insert does not write `gender`.

### `elv8_attendees`

Same shape as B1G, including nullable `gender`. The ELV8 registration function does write `gender`. Nothing on the home page reads this table except the unused event-name helper.

### `attendance_log`

One row per person per service date.

| Column | Notes |
| ------ | ----- |
| `id` | UUID |
| `attendee_id` | FK to `attendees`, `ON DELETE CASCADE` |
| `b1g_attendee_id` | FK to `b1g_attendees`, `ON DELETE CASCADE` |
| `elv8_attendee_id` | FK to `elv8_attendees`, `ON DELETE CASCADE` |
| `ministry` | `elevate` (default), `b1g`, or `elv8` |
| `service_date` | Date. App sends the UTC calendar date. |
| `check_in_time` | `now()` |
| `facilitator_id` | FK to `facilitators`, `ON DELETE SET NULL`. This is the assignment for that day. |
| `first_name`, `last_name` | Snapshots written at check-in |

`attendance_log_person_xor` requires exactly one of the three person foreign keys. Partial unique indexes `uq_attendance_elevate_per_day`, `uq_attendance_b1g_per_day`, and `uq_attendance_elv8_per_day` block a second check-in the same day. The app maps unique violations to “already checked in.”

## Row Level Security

RLS is enabled on all five tables. Every policy targets `anon` with `USING (true)` / `WITH CHECK (true)`.

| Table | Select | Insert | Update | Delete |
| ----- | ------ | ------ | ------ | ------ |
| `attendees` | yes | yes | yes | no policy |
| `b1g_attendees` | yes | yes | yes | yes |
| `elv8_attendees` | yes | yes | yes | yes |
| `attendance_log` | yes | yes | yes, from `migration_add_default_facilitator.sql` | yes |
| `facilitators` | yes | yes | yes | yes |

The app deletes only `attendance_log` (`removeCheckIn`). It never deletes people. Facilitator “remove” is an update of `is_facilitating`.

Transfers and demotion need **Allow anonymous update on attendance_log**. Creating a database from `schema.sql` alone does not add that policy, so those actions fail until `migration_add_default_facilitator.sql` (or an equivalent policy) has been applied.

## What the client touches

All access is in `src/lib/services/attendance.ts`.

| Table | Operations |
| ----- | ---------- |
| `attendees` | Select, insert, update `facilitator_id` (and bulk clear on demote) |
| `b1g_attendees` | Select, insert |
| `elv8_attendees` | Select (event-name helper), insert |
| `attendance_log` | Select, insert, update `facilitator_id`, delete by id |
| `facilitators` | Select, upsert on promote, update `is_facilitating` on demote |

## `is_facilitating`

Documented for operators in [supabase/README_IS_FACILITATING.md](../supabase/README_IS_FACILITATING.md).

- `true` (default): eligible for the Facilitators tab and new assignments.
- `false`: hidden from that tab, still able to check in. Existing downline rows are left in place unless someone uses **Remove as Facilitator** in the app, which also reassigns people.

## Schema drift to remember

| Topic | Current code expects | `schema.sql` alone |
| ----- | -------------------- | ------------------- |
| ELV8 table, ministry, three-way check | yes | missing |
| Log `first_name` / `last_name` | yes | missing |
| `b1g_attendees.gender` | yes | missing |
| Elevate contact nullable + partial unique | yes | `UNIQUE NOT NULL` |
| Update policy on `attendance_log` | required for transfers | missing |

After changing columns, update `src/lib/types/database.types.ts` and the domain types in `src/lib/types/attendance.ts`.
