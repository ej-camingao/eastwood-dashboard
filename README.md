# Elevate Eastwood — Registration & Check-In

Mobile-first attendance app for the **Elevate Eastwood Saturday Service**. Volunteers register first-time attendees, check in returning people, and assign facilitators to breakout groups. The browser talks to **Supabase** directly. There is no custom API in this repo.

The npm package name is `eastwood-dashboard`.

## What you can do

- **Registration** — first-time Elevate registration (name, gender, optional mobile, school, address, DGroup, how they heard about Elevate) and same-day check-in.
- **Check-In** — search Elevate and B1G people by name or contact number, check them in, and remove a check-in from today’s list.
- **Facilitators** — gender-grouped breakout groups: transfer people, promote an attendee to facilitator, or remove a facilitator. This tab asks for a password stored in the page source. That check runs only in the browser.

B1G Eastwood and ELV8 registration forms and service functions exist in the codebase. The home page mounts the Elevate registration form only. Returning search and the facilitator tools include B1G. ELV8 is not part of search, today’s list, or facilitator assignment.

## Stack

| Layer | Choice |
| ----- | ------ |
| App | SvelteKit 2, Svelte 5, TypeScript |
| Build | Vite 7, `@sveltejs/adapter-auto` |
| Style | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Data | Supabase (`@supabase/supabase-js`), anon key, Row Level Security |

State lives in the page with Svelte 5 runes. `npm run check` (`svelte-check`) is the quality gate. There is no test runner, linter, or CI workflow in the repo.

## Prerequisites

- Node.js 20.19+ or 22.12+ (Vite 7)
- npm
- A Supabase project

## Setup

### 1. Install

```sh
npm install
```

### 2. Database

In the Supabase SQL Editor:

1. Run `supabase/schema.sql` on a new project.
2. Then run every `supabase/migration_*.sql` that is not already reflected in that snapshot. Order and the gaps in `schema.sql` are listed in [docs/database.md](docs/database.md).

`schema.sql` is a partial snapshot. A database created from that file alone is missing ELV8, attendance name snapshots, B1G gender, nullable Elevate contact numbers, and the `attendance_log` update policy.

### 3. Environment

Create `.env` at the repo root. No `.env.example` is committed.

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

`src/lib/supabase.ts` throws on import when either variable is missing. Restart the dev server after changing `.env`.

### 4. Run

```sh
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run check` | Type-check components and TypeScript |
| `npm run check:watch` | `check` in watch mode |

## Usage

### Registration

1. Open the **Registration** tab.
2. Fill the required fields. Mobile number is optional: choose “No” to leave contact empty.
3. When a number is entered, the page prefixes `+63`.
4. Submit **Register & Check In**. The person is stored and checked in for today’s service date, then auto-assigned to a gender-matched facilitator when one is checked in.

### Check-In

1. Open the **Check-In** tab.
2. Type at least two characters of a name or contact number. Search waits 400ms, then queries Elevate and B1G (up to 10 hits each).
3. Choose a result to check them in for today. A second check-in on the same service date is rejected.
4. Today’s list can refresh or remove a check-in (deletes that `attendance_log` row).

### Facilitators

1. Open **Facilitators** and enter the panel password.
2. Male and female facilitators who are checked in today appear with their downlines.
3. Transfer moves today’s assignment. Elevate transfers also update `attendees.facilitator_id`. B1G transfers update the log only. Gender must match.
4. **Make into Facilitator** upserts a `facilitators` row using the person’s existing id. **Remove as Facilitator** sets `is_facilitating` to false and reassigns their downline.

Facilitator rows are maintained in Supabase. `is_facilitating = false` hides someone from this tab while they can still check in as a regular attendee. See [supabase/README_IS_FACILITATING.md](supabase/README_IS_FACILITATING.md).

## Project structure

```
src/
├── routes/
│   ├── +layout.svelte          # Fonts, title, page shell
│   └── +page.svelte            # Tabs, forms, facilitator password gate
├── lib/
│   ├── supabase.ts             # Browser Supabase client
│   ├── services/attendance.ts  # All queries and check-in rules
│   ├── components/             # Registration, check-in, facilitator UI
│   ├── types/                  # Domain types and Database typings
│   └── utils/                  # Validation, formatting, constants
supabase/
├── schema.sql                  # Partial base schema
└── migration_*.sql             # Incremental changes
docs/
├── onboarding.md               # Day-one reading order
├── architecture.md             # How the page and service fit together
└── database.md                 # Tables, migrations, RLS
```

## Further reading

- [docs/onboarding.md](docs/onboarding.md) — where to start in the code
- [docs/architecture.md](docs/architecture.md) — routes, data flow, components
- [docs/database.md](docs/database.md) — current schema and migration order

## Notes

- The service date is the UTC calendar date from `new Date().toISOString().split('T')[0]`, which can differ from the Philippine date late in the evening.
- Elevate contact numbers are unique when present and may be null. B1G and ELV8 contact numbers are required and are not unique.
- The layout favicon points at `/elevate-logo.png` and the logo component at `/elevate-full-logo.png`. Those image files are not in `static/`.
- `static/attendance_log_rows.csv` is a check-in export. Files in `static/` are served publicly.

## License

Private project for Elevate Saturday Service.
