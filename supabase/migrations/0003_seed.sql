-- Seed data: 2-day split. See SPEC.md §6.
-- Idempotent: re-running this migration is a no-op.

insert into exercise_splits (id, name) values
  ('2day', '2-Day Split')
on conflict (id) do nothing;

-- Day A exercises (idempotent via unique(split_id, day, order_index)).
insert into exercises (name, split_id, day, order_index, notes)
select 'Squat',          '2day', 1, 1, null
where not exists (select 1 from exercises where split_id = '2day' and day = 1 and order_index = 1);

insert into exercises (name, split_id, day, order_index, notes)
select 'Bench Press',    '2day', 1, 2, null
where not exists (select 1 from exercises where split_id = '2day' and day = 1 and order_index = 2);

insert into exercises (name, split_id, day, order_index, notes)
select 'RDL',            '2day', 1, 3, null
where not exists (select 1 from exercises where split_id = '2day' and day = 1 and order_index = 3);

insert into exercises (name, split_id, day, order_index, notes)
select 'Bent Over Rows', '2day', 1, 4, null
where not exists (select 1 from exercises where split_id = '2day' and day = 1 and order_index = 4);

-- Day B exercises.
insert into exercises (name, split_id, day, order_index, notes)
select 'Deadlift',               '2day', 2, 1, '@ 90% 1RM'
where not exists (select 1 from exercises where split_id = '2day' and day = 2 and order_index = 1);

insert into exercises (name, split_id, day, order_index, notes)
select 'Overhead Press',         '2day', 2, 2, null
where not exists (select 1 from exercises where split_id = '2day' and day = 2 and order_index = 2);

insert into exercises (name, split_id, day, order_index, notes)
select 'Pull-ups',                '2day', 2, 3, null
where not exists (select 1 from exercises where split_id = '2day' and day = 2 and order_index = 3);

insert into exercises (name, split_id, day, order_index, notes)
select 'Dips',                    '2day', 2, 4, null
where not exists (select 1 from exercises where split_id = '2day' and day = 2 and order_index = 4);

insert into exercises (name, split_id, day, order_index, notes)
select 'Bulgarian Split Squats',  '2day', 2, 5, null
where not exists (select 1 from exercises where split_id = '2day' and day = 2 and order_index = 5);

-- Set templates per exercise. Guarded by unique(exercise_id, order_index).
-- Squat
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'top_set', 1, 4, 6, 1, null from exercises e
where e.name = 'Squat' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'backoff', 2, 6, 10, 2, null from exercises e
where e.name = 'Squat' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 2);

-- Bench Press
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'top_set', 1, 4, 6, 1, null from exercises e
where e.name = 'Bench Press' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'backoff', 2, 8, 10, 2, null from exercises e
where e.name = 'Bench Press' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 2);

-- RDL
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 6, 10, 3, null from exercises e
where e.name = 'RDL' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

-- Bent Over Rows
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 8, 10, 3, null from exercises e
where e.name = 'Bent Over Rows' and e.split_id = '2day' and e.day = 1
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

-- Deadlift
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 1, 1, 3, '@ 90% 1RM' from exercises e
where e.name = 'Deadlift' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

-- Overhead Press
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'top_set', 1, 4, 6, 1, null from exercises e
where e.name = 'Overhead Press' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'backoff', 2, 6, 10, 2, null from exercises e
where e.name = 'Overhead Press' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 2);

-- Pull-ups
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 8, 10, 3, null from exercises e
where e.name = 'Pull-ups' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

-- Dips
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 8, 10, 3, null from exercises e
where e.name = 'Dips' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);

-- Bulgarian Split Squats
insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'normal', 1, 8, 10, 2, null from exercises e
where e.name = 'Bulgarian Split Squats' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 1);
