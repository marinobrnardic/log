# RLS verification checklist

Manual procedure, run once after deployment and after any change to `supabase/migrations/0002_rls.sql`. Per SPEC.md §15.3.

## Setup

1. Spin up the app pointing at the target Supabase project.
2. Create two test users via `/signup`:
   - User A: `a+rls@local.test`
   - User B: `b+rls@local.test`
3. As **User A**, create one workout (Day A) with at least one logged set and one skipped set. Note its UUID from `/workouts/[id]` (or pull it from `workouts` via the Supabase dashboard).

## Verify isolation (sign in as User B)

Expected: User B cannot see or touch any of User A's data.

- [ ] `/workouts` shows an empty state (or only User B's own workouts).
- [ ] Navigating directly to `/workouts/<UserA-workout-id>` renders the **not found** page (the server query returns null).
- [ ] In the browser dev console, against a Supabase client logged in as B:
  - [ ] `supabase.from('workouts').select('*').eq('id', '<UserA-workout-id>')` returns `data: []`.
  - [ ] `supabase.from('workout_exercises').select('*').eq('workout_id', '<UserA-workout-id>')` returns `data: []`.
  - [ ] `supabase.from('sets').select('*')` returns only B's own sets (or empty).
  - [ ] `supabase.from('workouts').update({ day: 2 }).eq('id', '<UserA-workout-id>')` returns 0 rows updated.
  - [ ] `supabase.from('workouts').delete().eq('id', '<UserA-workout-id>')` returns 0 rows deleted.
- [ ] User B can still read `exercises`, `exercise_splits`, `exercise_set_templates` (the seed data is shared).

## Verify ownership writes (sign in as User A)

- [ ] User A can edit and delete their own workout via the UI.
- [ ] Both `update_workout_sets` and `save_workout` succeed for User A.

If any box above fails, audit `supabase/migrations/0002_rls.sql` and the RPC `SECURITY` clauses in `0004_save_workout_rpc.sql` before proceeding.
