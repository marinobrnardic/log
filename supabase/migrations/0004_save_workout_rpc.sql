-- RPCs for the guided workout flow. See SPEC.md §4 ("Persistence timing"), §9.
--
-- Save shape (matches client builder):
--   p_day:        1 | 2
--   p_exercises:  jsonb [
--     {
--       "exercise_id": uuid,
--       "order_index": int,
--       "sets": [
--         { "set_template_id": uuid|null, "order_index": int,
--           "reps": int|null, "weight": float|null, "is_skipped": bool }
--       ]
--     }
--   ]
--
-- Update shape:
--   p_workout_id: uuid (must belong to the caller)
--   p_sets:       jsonb [
--     { "id": uuid, "reps": int|null, "weight": float|null, "is_skipped": bool }
--   ]
--
-- Both run as SECURITY INVOKER so RLS applies. They also explicitly enforce
-- ownership so a missing policy still can't leak rows.

create or replace function public.save_workout(
  p_day        int,
  p_exercises  jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_workout_id uuid;
  v_we_id      uuid;
  v_exercise   jsonb;
  v_set        jsonb;
begin
  if v_user is null then
    raise exception 'auth.uid() is null';
  end if;

  if p_day not in (1, 2) then
    raise exception 'invalid day: %', p_day;
  end if;

  insert into workouts (user_id, split_id, day)
    values (v_user, '2day', p_day)
    returning id into v_workout_id;

  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    insert into workout_exercises (workout_id, exercise_id, order_index)
      values (
        v_workout_id,
        (v_exercise->>'exercise_id')::uuid,
        (v_exercise->>'order_index')::int
      )
      returning id into v_we_id;

    for v_set in select * from jsonb_array_elements(v_exercise->'sets') loop
      insert into sets (
        workout_exercise_id, set_template_id, order_index,
        reps, weight, is_skipped
      ) values (
        v_we_id,
        nullif(v_set->>'set_template_id', '')::uuid,
        (v_set->>'order_index')::int,
        nullif(v_set->>'reps', '')::int,
        nullif(v_set->>'weight', '')::float,
        coalesce((v_set->>'is_skipped')::boolean, false)
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

create or replace function public.update_workout_sets(
  p_workout_id uuid,
  p_sets       jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_set  jsonb;
begin
  if v_user is null then
    raise exception 'auth.uid() is null';
  end if;

  -- Defence-in-depth: refuse if the workout isn't ours, even though RLS would.
  if not exists (
    select 1 from workouts w where w.id = p_workout_id and w.user_id = v_user
  ) then
    raise exception 'workout not found';
  end if;

  for v_set in select * from jsonb_array_elements(p_sets) loop
    update sets s
      set reps       = nullif(v_set->>'reps', '')::int,
          weight     = nullif(v_set->>'weight', '')::float,
          is_skipped = coalesce((v_set->>'is_skipped')::boolean, false),
          updated_at = now()
      from workout_exercises we
      where s.id = (v_set->>'id')::uuid
        and s.workout_exercise_id = we.id
        and we.workout_id = p_workout_id;
  end loop;

  update workouts set updated_at = now() where id = p_workout_id;
end;
$$;

grant execute on function public.save_workout(int, jsonb) to authenticated;
grant execute on function public.update_workout_sets(uuid, jsonb) to authenticated;
