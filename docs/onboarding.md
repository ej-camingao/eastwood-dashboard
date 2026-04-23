# Onboarding – Eastwood Dashboard (Elevate Saturday Service)

Day-one guide for a junior engineer. Scan top-to-bottom; jump into code via the file pointers.

---

## 1. What this is

Mobile-first **SvelteKit** app for the **Elevate Saturday Service registration and check-in** flow. Supports:

- First-time attendee registration
- Returning-user search + same-day check-in (with duplicate prevention)
- Facilitator-related UI

Data lives in **Supabase (PostgreSQL)**. There is **no custom backend** in this repo — the browser talks to Supabase directly using the anon key + RLS.

(npm package name is `eastwood-dashboard`; product name in README is “Elevate Saturday Service – Registration App”.)

---

## 2. Stack & dependencies

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Runtime  | Node **18+** (`.npmrc` sets `engine-strict=true`)     |
| App      | **SvelteKit 2.x**, **Svelte 5.x**, **TypeScript** strict |
| Build    | **Vite 7.x**, `@sveltejs/adapter-auto`                |
| Styling  | **Tailwind CSS 4** via `@tailwindcss/vite`            |
| Data     | **Supabase** (`@supabase/supabase-js`)                |

Not configured: test runner, ESLint, Prettier, Playwright, CI workflows.

---

## 3. How to run it

1. `npm install`
2. Apply DB in Supabase SQL Editor:
   - Run `supabase/schema.sql`
   - Apply `supabase/migration_*.sql` as needed (order not centrally documented — read each script or ask the team)
3. Create `.env` at repo root (no `.env.example` is committed):

   ```env
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. `npm run dev` → http://localhost:5173

| Command          | Purpose                        |
| ---------------- | ------------------------------ |
| `npm run dev`    | Dev server                     |
| `npm run build`  | Production build               |
| `npm run preview`| Preview production build       |
| `npm run check`  | `svelte-check` (types/templates) — primary quality gate |

If `PUBLIC_SUPABASE_*` are missing, `src/lib/supabase.ts` **throws at import** and the app will not boot.

---

## 4. Project structure

| Path                              | Role                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `src/routes/+layout.svelte`       | App shell (fonts, favicon, wrapper)                                  |
| `src/routes/+page.svelte`         | Single main page — tabs & state (no `+page.server.ts` / hooks)       |
| `src/lib/services/attendance.ts`  | **Central** Supabase calls + registration/check-in business rules (large file) |
| `src/lib/components/*.svelte`     | UI: `RegistrationForm`, `ReturningUserCheckIn`, `FacilitatorTab`, `SearchInput`, `Toast`, `Alert`, `AttendeeCard`, `AttendeeList`, `FormField`, `TabButton`, `Logo`, `FacilitatorCard` |
| `src/lib/utils/`                  | `validation.ts`, `constants.ts`, `formatting.ts`                     |
| `src/lib/types/`                  | `attendance.ts`, `database.types.ts` (Supabase-typed)                |
| `src/lib/supabase.ts`             | Single Supabase client export (`persistSession: false`, `autoRefreshToken: false`) |
| `supabase/`                       | `schema.sql`, multiple `migration_*.sql`, `README_IS_FACILITATING.md`|
| `static/`                         | `robots.txt`, `elevate-full-logo.png`                                |

---

## 5. Main concepts & where they live

- **Attendee / attendance domain** — types in `src/lib/types/attendance.ts`; all persistence and rules in **`src/lib/services/attendance.ts`** (maps to README tables `attendees`, `attendance_log`).
- **First-time registration** — `components/RegistrationForm.svelte` + `utils/validation.ts`.
- **Returning user check-in** — `components/ReturningUserCheckIn.svelte` + `SearchInput.svelte`; debounced search against Supabase via `attendance.ts`.
- **Facilitators** — `components/FacilitatorTab.svelte`, `FacilitatorCard.svelte`; see `supabase/README_IS_FACILITATING.md` and the facilitator migrations.
- **DB type contract** — `src/lib/types/database.types.ts` (keep synced when schema changes).

---

## 6. Conventions & practices

- **Svelte 5 runes** (`$state`, `$props`) — no separate global store package.
- **Env**: only `PUBLIC_*` vars, imported via `$env/static/public`.
- **Quality gate today**: `npm run check` only. No unit/E2E tests in the tree.
- **Security model**: anon key in the browser + **Supabase RLS / policies**. Enforcement lives in SQL migrations, not in TS.

---

## 7. Where to start as a junior

1. Read `README.md` for product behavior and schema overview.
2. Open `src/routes/+page.svelte` — entry point for tabs and top-level state.
3. Read `src/lib/services/attendance.ts` in chunks — source of truth for Supabase usage and business rules.
4. Skim `src/lib/types/attendance.ts` and `database.types.ts` before touching any query/insert.
5. For facilitator logic, read `supabase/README_IS_FACILITATING.md` and the related migrations.

**Before changing check-in/registration rules:** align with whoever owns Supabase **RLS / policies** — migrations reference policies, and behavior is not only in TypeScript.

---

## 8. Gotchas & important notes

- **No `.env.example` committed** despite README — create `.env` manually.
- **Favicon mismatch**: `+layout.svelte` references `/elevate-logo.png`, but `static/` actually contains `elevate-full-logo.png`. Either rename the file or update the `<link rel="icon">`.
- **README tech line** says “SvelteKit 5”; the repo is actually **SvelteKit 2 + Svelte 5** — trust `package.json`.
- **No SvelteKit server routes / hooks** — all data access is client → Supabase. Do not assume server-side enforcement; rely on RLS.
- **`src/lib/services/attendance.ts` is large (~1000+ lines)** — concentrates business + Supabase logic. Expect merge conflicts; prefer small, focused changes until it is split.
- **Migrations**: order is not documented in one place — read each `supabase/migration_*.sql` before applying to an existing database.

---

**Verified against:** `package.json`, `README.md`, `src/lib/supabase.ts`, `src/routes/+layout.svelte`, and directory listings of `src/lib`, `src/routes`, `supabase`, and `static`.
