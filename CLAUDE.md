# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SPEC.md is authoritative

[SPEC.md](SPEC.md) defines product behavior, data model, RLS, UX rules, and validation contracts. When code disagrees with the spec, the spec wins unless the user says otherwise. When you change behavior that the spec covers, update the spec too. The spec also points at specific files as "source of truth" (e.g. seed SQL, RLS policies) — edit those files, not the spec's prose tables.

## Common commands

```bash
pnpm dev          # next dev (http://localhost:3000)
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint (eslint flat config; next/core-web-vitals + next/typescript)
pnpm test         # vitest run — unit tests always; integration suite self-skips unless SUPABASE_SERVICE_ROLE_KEY is set
pnpm build        # production build (Serwist generates public/sw.js)
```

Single test file: `pnpm test tests/unit/warmup.test.ts`. Single test name: append `-t "name"`.

CI ([.github/workflows/test.yml](.github/workflows/test.yml)) runs `pnpm typecheck` then `pnpm test` on every push.

## Supabase

Migrations under [supabase/migrations/](supabase/migrations) apply in lexical order and are idempotent. After schema changes regenerate types: `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`. Local dev: `supabase start`, then `supabase db reset` re-runs migrations + seed. The integration test in [tests/integration/workout-creation.test.ts](tests/integration/workout-creation.test.ts) talks to a real local Supabase and self-skips when env vars are missing.

## Architecture

Next.js 15 App Router, React 19, Supabase (Postgres + Auth), Tailwind v4. PWA via `@serwist/next` (service worker generated from [src/sw.ts](src/sw.ts) at build time; disabled in dev).

**Path alias:** `@/*` → `src/*`. App Router pages live under [app/](app), everything else under [src/](src).

### Auth & route shape

- [middleware.ts](middleware.ts) runs every non-asset request through [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts), which refreshes the Supabase session cookie and redirects: unauthenticated → `/login`; authenticated on an auth route or `/` → `/workouts`.
- Route groups split the shell: `app/(auth)` is the logged-out shell (login/signup/reset-password — no nav), `app/(app)` is the logged-in shell with top nav + bottom tabs. `app/auth/callback/` handles OAuth/reset code exchange.
- Three Supabase client factories in [src/lib/supabase/](src/lib/supabase): `client.ts` for browser components, `server.ts` for Server Components / Server Actions (handles the can't-set-cookies-from-RSC case silently), `middleware.ts` for the auth middleware.

### Guided workout entry (the central flow)

Per SPEC §3 & §9, **nothing is persisted until Save Workout on the recap.** The entry flow is a client-side reducer, not per-set DB writes:

- [src/lib/entry/reducer.ts](src/lib/entry/reducer.ts) — pure state machine with phases `day → entry → recap`. Holds the `WorkoutPlan`, per-set values, current index, `dirty` flag (drives the discard dialog), and `returnToRecap` flag (drives edit-from-recap mode where the next "Next" returns to recap instead of advancing).
- [src/lib/domain/sets.ts](src/lib/domain/sets.ts) builds the `WorkoutPlan` from exercise + template rows (expands `default_sets`, assigns labels like "Top Set" / "Back-off 1", computes `isFirstOfExercise` which gates warmup display).
- [src/components/entry/GuidedFlow.tsx](src/components/entry/GuidedFlow.tsx) is the React shell that dispatches into the reducer; [DayPicker](src/components/entry/DayPicker.tsx), [SetInputs](src/components/entry/SetInputs.tsx), [SetProgress](src/components/entry/SetProgress.tsx), [WarmupSection](src/components/entry/WarmupSection.tsx), [DiscardDialog](src/components/entry/DiscardDialog.tsx) are its pieces.
- The same `GuidedFlow` powers `/workouts/new` (phases day → entry → recap) and `/workouts/[id]/edit` (skips the day phase, prefills values with existing set IDs so save dispatches `update_workout_sets` instead of `save_workout`).
- Pre-population of working-set weights from previous results lives in [src/lib/domain/progression.ts](src/lib/domain/progression.ts), with a user-configurable increment in `user_settings` (migration 0006).

### Persistence

Writes go through two SECURITY INVOKER Postgres RPCs in [supabase/migrations/0004_save_workout_rpc.sql](supabase/migrations/0004_save_workout_rpc.sql), called from server actions in [src/actions/workouts.ts](src/actions/workouts.ts) via typed wrappers in [src/lib/db/queries.ts](src/lib/db/queries.ts):

- `save_workout(day, exercises_jsonb)` — inserts one `workouts` + N `workout_exercises` + M `sets` in a single function call. Used by `/workouts/new`.
- `update_workout_sets(workout_id, sets_jsonb)` — UPDATEs existing `sets` rows in place; never creates new `workouts` or `workout_exercises`. Used by `/workouts/[id]/edit`. Explicitly re-checks ownership as defence-in-depth on top of RLS.

Don't add direct table inserts for these flows — go through the RPC so RLS and ownership checks stay consistent. Server actions call `revalidatePath("/workouts")` and `/analytics` after mutations.

### Domain logic (pure, unit-tested)

[src/lib/domain/](src/lib/domain) contains the logic with silent-failure risk (wrong-number bugs): `warmup.ts` (50/70/90% with 5kg rounding, 20kg floor, Deadlift uses `last_working_weight / 0.9` as anchor), `analytics.ts` (Epley 1RM, top-set selection, skipped-set exclusion), `sets.ts` (plan construction), `progression.ts` (next-weight suggestions). Each has a sibling test under [tests/unit/](tests/unit). Keep these modules pure — no Supabase imports, no React — so they stay trivially testable.

### Read-side queries

[src/lib/db/queries.ts](src/lib/db/queries.ts) holds typed Supabase queries (history list, single workout join, exercises-for-day). Components consume these from Server Components; client interactivity (entry flow, dialogs) lives under `src/components/`.

### RLS

`workouts.user_id` is the ownership root; `workout_exercises` and `sets` inherit through it. Policies in [supabase/migrations/0002_rls.sql](supabase/migrations/0002_rls.sql) — edit there, not in the spec. After policy changes, run [tests/RLS-CHECKLIST.md](tests/RLS-CHECKLIST.md) manually.

## Conventions worth knowing

- Dark mode only; the `<html>` element is hard-coded `className="dark"` in [app/layout.tsx](app/layout.tsx). Don't add a theme toggle.
- All workout-date displays go through one formatter ([src/lib/format.ts](src/lib/format.ts)) so "Today / Yesterday / N days ago / Mon, May 4 / May 4, 2025" stays consistent. The diff is computed from calendar days, not millisecond deltas.
- Set Entry primary button stays tappable when invalid (`aria-disabled`, dimmed) and focuses the first empty input on tap — SPEC §8 calls this out specifically; don't switch it to a hard `disabled`.
- Confirmation dialogs (discard, delete) render via React portal into `document.body` so the sticky entry/recap footer doesn't clip them.
- Don't introduce new accent colors — green (`#22C55E`) is the only one in v1.
