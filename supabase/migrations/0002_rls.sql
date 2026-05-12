-- Row Level Security. See SPEC.md §12.

alter table workouts            enable row level security;
alter table workout_exercises   enable row level security;
alter table sets                enable row level security;
alter table exercises           enable row level security;
alter table exercise_splits     enable row level security;
alter table exercise_set_templates enable row level security;

-- workouts
drop policy if exists "Users can view own workouts" on workouts;
create policy "Users can view own workouts"
  on workouts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own workouts" on workouts;
create policy "Users can insert own workouts"
  on workouts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own workouts" on workouts;
create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own workouts" on workouts;
create policy "Users can delete own workouts"
  on workouts for delete
  using (auth.uid() = user_id);

-- workout_exercises (indirect ownership)
drop policy if exists "Users can manage own workout_exercises" on workout_exercises;
create policy "Users can manage own workout_exercises"
  on workout_exercises for all
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id
        and w.user_id = auth.uid()
    )
  );

-- sets (indirect ownership)
drop policy if exists "Users can manage own sets" on sets;
create policy "Users can manage own sets"
  on sets for all
  using (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_exercises we
      join workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id
        and w.user_id = auth.uid()
    )
  );

-- Read-only template tables for authenticated users.
drop policy if exists "Authenticated users can read exercises" on exercises;
create policy "Authenticated users can read exercises"
  on exercises for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read exercise_splits" on exercise_splits;
create policy "Authenticated users can read exercise_splits"
  on exercise_splits for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read exercise_set_templates" on exercise_set_templates;
create policy "Authenticated users can read exercise_set_templates"
  on exercise_set_templates for select
  using (auth.role() = 'authenticated');
