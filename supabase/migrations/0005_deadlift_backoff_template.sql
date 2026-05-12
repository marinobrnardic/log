-- Add a backoff template for Deadlift.
-- The seed in 0003_seed.sql gave Deadlift only a `normal` template (3 heavy
-- singles @ 90% 1RM). In practice the user pairs those with 2 higher-rep
-- backoff sets (typically 5-10 reps @ 50-70% of top). Adding the template
-- here lets the guided-entry flow surface those slots and lets imports
-- capture them rather than drop them.

insert into exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
select e.id, 'backoff', 2, 5, 10, 2, null from exercises e
where e.name = 'Deadlift' and e.split_id = '2day' and e.day = 2
  and not exists (select 1 from exercise_set_templates t where t.exercise_id = e.id and t.order_index = 2);
