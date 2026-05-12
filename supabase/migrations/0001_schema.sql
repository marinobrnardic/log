-- Schema for the workout logger. See SPEC.md §4.

create extension if not exists pgcrypto;

create table if not exists exercise_splits (
  id   text primary key,
  name text not null
);

create table if not exists exercises (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  split_id    text not null references exercise_splits(id),
  day         int  not null check (day in (1, 2)),
  order_index int  not null,
  notes       text,
  is_active   boolean not null default true,
  unique (split_id, day, order_index)
);

create table if not exists exercise_set_templates (
  id              uuid primary key default gen_random_uuid(),
  exercise_id     uuid not null references exercises(id) on delete cascade,
  type            text not null check (type in ('top_set', 'backoff', 'normal')),
  order_index     int  not null,
  target_reps_min int  not null,
  target_reps_max int  not null,
  default_sets    int  not null,
  notes           text,
  unique (exercise_id, order_index)
);

create table if not exists workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  split_id   text not null references exercise_splits(id),
  day        int  not null check (day in (1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  order_index int  not null,
  unique (workout_id, order_index)
);

create table if not exists sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_template_id     uuid references exercise_set_templates(id),
  order_index         int  not null,
  reps                int,
  weight              float,
  is_skipped          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (workout_exercise_id, order_index),
  -- when not skipped, reps and weight are required and positive
  check (
    is_skipped or (reps is not null and reps >= 1 and weight is not null and weight > 0)
  )
);

create index if not exists workouts_user_created_idx
  on workouts (user_id, created_at desc);

create index if not exists workout_exercises_workout_idx
  on workout_exercises (workout_id);

create index if not exists sets_workout_exercise_idx
  on sets (workout_exercise_id, order_index);

create index if not exists exercises_split_day_idx
  on exercises (split_id, day, order_index);

create index if not exists set_templates_exercise_idx
  on exercise_set_templates (exercise_id, order_index);
