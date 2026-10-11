# Architecture

Elevate Eastwood is a single-page SvelteKit app. One route renders three tabs. Every database call goes from the browser to Supabase through `src/lib/services/attendance.ts`.

## Runtime

```
Browser (+page.svelte)
  → components (forms, lists, facilitator cards)
  → attendance.ts
  → supabase.ts (anon client)
  → Supabase Postgres + RLS
```

There are no `+page.server.ts` loads, form actions, API routes, or `hooks.server.ts`. Row Level Security is the access control. The anon key is public by design; policies in `supabase/` decide what that key can do. Those policies currently allow broad anonymous read and write. See [database.md](database.md).

`src/lib/supabase.ts` creates one client:

- Typed with `Database` from `src/lib/types/database.types.ts`
- `persistSession: false` and `autoRefreshToken: false` (no Supabase Auth session)
- Throws at import if `PUBLIC_SUPABASE_URL` or `PUBLIC_SUPABASE_ANON_KEY` is missing

Svelte 5 runes hold UI state on the page (`$state`, `$derived`, `$effect`, `$props`). Components take callback props. None use `createEventDispatcher`.

Build config:

- `svelte.config.js` — `vitePreprocess()`, `@sveltejs/adapter-auto`
- `vite.config.ts` — SvelteKit plugin and Tailwind 4 via `@tailwindcss/vite`
- `src/app.css` — Tailwind import and brand tokens (red Elevate theme)

## Page composition

`src/routes/+layout.svelte` loads `app.css`, Inter, the document title **Elevate Saturday Service - Registration & Check-In**, and a full-height gradient wrapper.

`src/routes/+page.svelte` is the whole product:

1. Logo and “Welcome to our Elevate Eastwood Service”
2. “Checked in today” count (length of today’s attendance list, loaded on mount)
3. Tabs: **Registration**, **Check-In**, **Facilitators**
4. An inline `Alert` for errors
5. The active panel
6. A success `Toast`
7. A password modal used when opening Facilitators

`activePath` is `'new' | 'returning' | 'facilitators'` and starts on Registration.

| Tab | Panel | Loads |
| --- | ----- | ----- |
| Registration | `RegistrationForm` | On submit |
| Check-In | `ReturningUserCheckIn` | Today’s list when the tab opens; search is debounced on the page |
| Facilitators | `FacilitatorTab`, after the password check | Facilitators and their downlines |

The Facilitators password is a constant in `+page.svelte`. Submitting the matching value sets a local flag and shows the tab. It is not an account, token, or server check. Anyone who can read the bundle can open the tab, and the anon key can already call the same Supabase operations.

## Registration and check-in

### Elevate (wired)

`handleRegistration` prefixes `+63` when a mobile number is present, runs `validateRegistrationForm`, then `registerNewAttendeeAndCheckIn`.

That function:

1. Inserts an `attendees` row with `is_first_timer: true`. Contact is null when the person has no mobile number.
2. Inserts an `attendance_log` row for today’s UTC date with `ministry` `elevate`, plus first and last name snapshots.
3. Calls `assignFacilitatorToAttendee` when the log has no facilitator yet.

Success copy: “Welcome to Elevate! You are checked in.”

Elevate auto-assign order inside `assignFacilitatorToAttendee`:

1. Skip when the person is already a facilitator.
2. Keep an existing `attendance_log.facilitator_id`.
3. Use `attendees.default_facilitator_id` when that facilitator is checked in today and the gender matches. This column is set in Supabase, not by the form.
4. Otherwise balance across facilitators of the same gender who are checked in today and have `is_facilitating = true`.

### Returning search (Elevate and B1G)

`searchAttendees` queries `attendees` and `b1g_attendees` in parallel with a case-insensitive `or` filter on first name, last name, and contact number, limited to 10 rows each. Results carry `ministry: 'elevate' | 'b1g'`. ELV8 is not searched.

`checkInAttendee(id, ministry)` rejects a duplicate for that person and service date, inserts the log with name snapshots, then assigns a facilitator (Elevate via `assignFacilitatorToAttendee`, B1G via `assignFacilitatorToB1GAttendee` when gender is known).

`getCheckedInAttendeesToday` reads today’s `attendance_log` and embeds `attendees` and `b1g_attendees`. The UI treats `ministry === 'b1g'` as B1G and every other ministry value as Elevate, so an ELV8 log would be mislabeled and would not join an Elevate person row.

`removeCheckIn` deletes one `attendance_log` row. The Check-In tab confirms first.

### B1G and ELV8 registration (present, not mounted)

`B1GRegistrationForm.svelte` and `ELV8RegistrationForm.svelte` are not imported by `+page.svelte`. The service still exports:

- `registerNewB1GAttendeeAndCheckIn` — inserts `b1g_attendees` without the `gender` column, writes a `b1g` log, then assigns a facilitator from the form’s gender for that one call. A later returning check-in reads `gender` from the row, which stays null, so auto-assign can skip.
- `registerNewELV8AttendeeAndCheckIn` — inserts `elv8_attendees` including gender and writes an `elv8` log. No search, returning check-in, today’s list, or facilitator path uses ELV8.

`getEventRegistrantNames` lists B1G and ELV8 rows created in a fixed April 2026 window. The home page does not call it.

## Facilitators

`loadFacilitators` runs `getAllFacilitatorsWithAttendees` and `getFacilitators`.

- `getFacilitators` returns rows with `is_facilitating = true`.
- `getAllFacilitatorsWithAttendees` keeps facilitators who are themselves checked in today and attaches downlines from today’s `attendance_log.facilitator_id` (Elevate and B1G).

| Action | Function | Effect |
| ------ | -------- | ------ |
| Transfer (Elevate) | `transferAttendee` | Updates today’s log and `attendees.facilitator_id`. Same gender required. |
| Transfer (B1G) | `transferB1GAttendee` | Updates today’s log only. |
| Promote | `promoteAttendeeToFacilitator` | Upserts `facilitators` with `id` equal to the Elevate or B1G person id. |
| Demote | `demoteFacilitator` | Sets `is_facilitating` false, clears assignments, re-assigns the demoted person and their former downline. |

`FacilitatorTab` groups cards by gender. Empty state tells the operator to add facilitators in Supabase.

## Components

| File | Role |
| ---- | ---- |
| `RegistrationForm.svelte` | Elevate first-timer form. Parent validates on submit. |
| `B1GRegistrationForm.svelte` | B1G form. Not mounted. |
| `ELV8RegistrationForm.svelte` | ELV8 form, titled “ELEVATE Registration”. Not mounted. |
| `ReturningUserCheckIn.svelte` | Search panel plus today’s attendance. |
| `SearchInput.svelte` | Search field and spinner. |
| `AttendeeCard.svelte` | One search hit and a Check In action. Badge is Elevate or B1G. |
| `AttendeeList.svelte` | Today’s roster, refresh, and remove. |
| `FacilitatorTab.svelte` | Gender sections and the transfer modal. |
| `FacilitatorCard.svelte` | One facilitator, their downline, transfer, and demote. |
| `FormField.svelte` | Label, required marker, help text. Forms do not pass field-level errors. |
| `TabButton.svelte` | Tab pill (`aria-pressed`). |
| `Alert.svelte` | Inline error or success banner. |
| `Toast.svelte` | Centered success overlay. |
| `Logo.svelte` | `/elevate-full-logo.png`, alt “Elevate Eastwood”. |

## Domain types

`src/lib/types/attendance.ts` is the app model:

- `Ministry = 'elevate' | 'b1g' | 'elv8'`
- `Attendee`, `B1GAttendee`, `ELV8Attendee` and matching registration payloads
- `SearchResult`, `CheckedInAttendee`, `Facilitator`, `FacilitatorWithAttendees`
- `ServiceResponse<T>` — `{ success, data?, error? }`

`src/lib/types/database.types.ts` is the Supabase row contract used by the client. Update it when columns change. Relationship arrays in that file are empty, so foreign keys are not expressed in the generated-style types.

`src/lib/utils/validation.ts` checks Elevate, B1G, and ELV8 forms. `constants.ts` holds display and regex helpers. `formatting.ts` formats contact numbers, check-in times, and today’s date for inputs.

## Conventions

- Keep Supabase calls in `attendance.ts`. The file is about 1,900 lines; small edits are easier to review than a drive-by split.
- Public env vars only, via `$env/static/public`.
- Gender for matching is `'Male' | 'Female'`.
- Heard-about values: Facebook, Friend, Family, Instagram, Others.

## Known gaps

- Home page does not mount B1G or ELV8 registration.
- B1G insert omits `gender`, so stored gender stays null.
- Today’s list and search ignore ELV8.
- Service date is UTC, not Asia/Manila.
- Logo and favicon paths 404 until those PNGs are added under `static/`.
- `static/attendance_log_rows.csv` is a real check-in export and is publicly served with the site.
