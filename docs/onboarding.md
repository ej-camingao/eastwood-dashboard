# Onboarding

Day-one guide for someone changing the Elevate Eastwood check-in app. Read this page, then the two references it points at.

## What this is

A mobile-first SvelteKit app for Saturday service registration, returning check-in, and facilitator breakout groups. Data lives in Supabase. The browser uses the anon key. There is no server route in this repo.

Package name: `eastwood-dashboard`. Product name in the UI: Elevate Eastwood / Elevate Saturday Service.

## Read next

1. [architecture.md](architecture.md) — tabs, service functions, and which ministries are actually on the page.
2. [database.md](database.md) — tables, the real migration order, and why `schema.sql` is not enough.
3. [supabase/README_IS_FACILITATING.md](../supabase/README_IS_FACILITATING.md) — hiding a facilitator without deleting them.

## Stack

| Layer | Tech |
| ----- | ---- |
| Runtime | Node.js 20.19+ or 22.12+ |
| App | SvelteKit 2, Svelte 5, TypeScript |
| Build | Vite 7, `@sveltejs/adapter-auto` |
| Style | Tailwind CSS 4 |
| Data | `@supabase/supabase-js` |

`npm run check` is the only quality gate. No unit tests, Playwright, ESLint, Prettier, or CI config are in the tree.

## Run it

1. `npm install`
2. Apply SQL using the order in [database.md](database.md).
3. Create `.env` (nothing named `.env.example` is committed):

   ```env
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. `npm run dev`

If those variables are missing, `src/lib/supabase.ts` throws at import and the app does not boot.

## Where the code lives

| Path | Role |
| ---- | ---- |
| `src/routes/+page.svelte` | Tabs, registration submit, search debounce, facilitator password flag |
| `src/lib/services/attendance.ts` | Every Supabase call and check-in rule |
| `src/lib/components/` | UI. `RegistrationForm` is the live registration form. B1G and ELV8 forms are unused by the route. |
| `src/lib/types/attendance.ts` | Domain types (`Ministry`, forms, `ServiceResponse`) |
| `src/lib/types/database.types.ts` | Table typings for the Supabase client |
| `src/lib/utils/` | `validation.ts`, `formatting.ts`, `constants.ts` |
| `supabase/` | `schema.sql` plus migrations |

## Suggested path through the code

1. `src/routes/+page.svelte` — see `activePath` and the three handlers: register, check in, transfer.
2. `registerNewAttendeeAndCheckIn`, `searchAttendees`, and `checkInAttendee` in `attendance.ts`.
3. `assignFacilitatorToAttendee` and `getAllFacilitatorsWithAttendees` when you touch breakout groups.
4. `attendance.ts` types before changing a query. Then confirm the column exists in [database.md](database.md), not only in `schema.sql`.

## Practices

- UI state uses Svelte 5 runes. Components expose callback props.
- Env vars are `PUBLIC_*` only, imported from `$env/static/public`.
- Put new queries in `attendance.ts` and return `ServiceResponse`.
- Schema changes need a migration, an update to `database.types.ts`, and a matching domain type.

## Gotchas

- **`schema.sql` is behind the migrations.** ELV8, log name columns, B1G gender, nullable contact numbers, and the `attendance_log` update policy live in later SQL files. Transfers fail without that update policy.
- **`attendance.ts` is about 1,900 lines.** It is the only data module. Expect conflicts; keep changes narrow.
- **ELV8 and B1G registration are not on the home page.** Search and facilitators include B1G. ELV8 registration can insert rows, and the dashboard will not list them correctly.
- **B1G registration does not save `gender`.** Auto-assign on a later check-in looks at the stored gender and can no-op.
- **Service date is UTC** (`toISOString` date slice), which can roll over before midnight in the Philippines.
- **Facilitators password** is a string in `+page.svelte`. It only hides the tab in the UI. Supabase policies still allow the anon key to read and write facilitator data.
- **Assets:** `+layout.svelte` requests `/elevate-logo.png` and `Logo.svelte` requests `/elevate-full-logo.png`. `static/` currently has `robots.txt` and `attendance_log_rows.csv`. The CSV is a check-in export and is served as a public static file.
- **`.npmrc` sets `engine-strict=true`** and `package.json` has no `engines` field, so npm will not enforce the Node version for you.
