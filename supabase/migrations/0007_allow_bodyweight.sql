-- Allow bodyweight (null weight) for flagged exercises. See SPEC.md §5, §6.
-- Currently flagged: Pull-ups, Dips. Other exercises still require weight > 0.

alter table exercises
  add column if not exists allow_bodyweight boolean not null default false;

update exercises
  set allow_bodyweight = true
  where split_id = '2day' and day = 2 and name in ('Pull-ups', 'Dips');

-- Relax the sets CHECK so weight may be null on a non-skipped row. The app
-- enforces the per-exercise rule via exercises.allow_bodyweight.
--
-- Postgres auto-names inline table-level CHECK constraints as
-- "<table>_check"; we also drop our new name in case the migration was
-- re-applied (idempotent).
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.sets'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%weight is not null%';
  if v_name is not null then
    execute format('alter table sets drop constraint %I', v_name);
  end if;
end $$;

alter table sets drop constraint if exists sets_weight_reps_check;

alter table sets
  add constraint sets_weight_reps_check check (
    is_skipped or (reps is not null and reps >= 1 and (weight is null or weight > 0))
  );
