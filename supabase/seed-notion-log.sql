-- One-off import of the user's Notion "Liftaona 2026" workout log into Supabase.
--
-- Source: Notion page "🏋🏻 Liftaona 2026"
--         (https://www.notion.so/2f6bab7e68d480779431cfcc449b1203)
--
-- Run once via psql:
--     psql "$DATABASE_URL" -f supabase/seed-notion-log.sql
-- or paste this whole file into the Supabase Studio SQL editor.
--
-- Per-cell parsing rules (Notion "Sets x Reps @ Weight" column → Supabase sets):
--   "3x1 @ 140kg"   = 3 sets × 1 rep × 140 kg              (S x R @ W)
--   "6x95kg"        = 1 set × 6 reps × 95 kg               (R x W shorthand)
--   "10x60kg, 8x60kg, 6x60kg" / "10x60kg / 8x60kg"
--                   = multiple sets, comma- or slash-separated
--   "80kg" / "145kg"= weight only, no reps                 → set marked is_skipped
--   parentheticals like "(failed 60kg at 1r)" / "(smanji kg, popravi teh)"
--                   = stripped before parsing
--   Croatian fail markers ("druga fail", "faila 160 pa 150", "barely") → skipped
--
-- Template-slot assignment:
--   Split exercises (Squat, Bench Press, OHP) — labels "(top set)" and "(back off)"
--   map to top_set / backoff templates. Unlabelled cells: first chunk → top_set,
--   remaining chunks → backoff in order.
--   Single-template exercises (RDL, Bent Over Rows, Pull-ups, Dips, BSS) — chunks
--   fill the available slots in order; leftover slots → is_skipped=true.
--   Deadlift — `normal` template (3 slots × 1 rep, the heavy singles) plus a
--   `backoff` template (2 slots, 5-10 reps) added in migration 0005. Notion
--   deadlift backoff strings like "2x10@100kg" / "backoff 2x6@120kg" fill the
--   backoff slots.
--
-- Pull-ups / Dips / Bulgarian Split Squats have no entries in the Notion source,
-- so every day-2 workout gets all-skipped rows for those exercises (mirrors what
-- the app would do if the user manually skipped them).
--
-- To re-run cleanly, first uncomment and execute:
-- delete from workouts
-- where user_id = (select id from auth.users where email = 'budsigur@gmail.com')
--   and created_at >= '2026-01-13' and created_at < '2026-05-13';

begin;

do $$
declare
  v_user_id uuid;
  v_workout_id uuid;
  v_we_sq  uuid; v_we_bp  uuid; v_we_rdl uuid; v_we_bor uuid;
  v_we_dl  uuid; v_we_ohp uuid; v_we_pu  uuid; v_we_dip uuid; v_we_bss uuid;
  v_ex_sq  uuid; v_ex_bp  uuid; v_ex_rdl uuid; v_ex_bor uuid;
  v_ex_dl  uuid; v_ex_ohp uuid; v_ex_pu  uuid; v_ex_dip uuid; v_ex_bss uuid;
  v_tpl_sq_top  uuid; v_tpl_sq_back  uuid;
  v_tpl_bp_top  uuid; v_tpl_bp_back  uuid;
  v_tpl_rdl     uuid; v_tpl_bor      uuid;
  v_tpl_dl      uuid; v_tpl_dl_back  uuid;
  v_tpl_ohp_top uuid; v_tpl_ohp_back uuid;
  v_tpl_pu      uuid; v_tpl_dip      uuid; v_tpl_bss      uuid;
begin
  -- Resolve user
  select id into v_user_id from auth.users where email = 'budsigur@gmail.com';
  if v_user_id is null then
    raise exception 'No auth.users row for email: budsigur@gmail.com. Sign up via the app first, then re-run.';
  end if;

  -- Resolve exercise IDs (day 1)
  select id into v_ex_sq  from exercises where name = 'Squat'          and split_id = '2day' and day = 1;
  select id into v_ex_bp  from exercises where name = 'Bench Press'    and split_id = '2day' and day = 1;
  select id into v_ex_rdl from exercises where name = 'RDL'            and split_id = '2day' and day = 1;
  select id into v_ex_bor from exercises where name = 'Bent Over Rows' and split_id = '2day' and day = 1;
  -- Resolve exercise IDs (day 2)
  select id into v_ex_dl  from exercises where name = 'Deadlift'               and split_id = '2day' and day = 2;
  select id into v_ex_ohp from exercises where name = 'Overhead Press'         and split_id = '2day' and day = 2;
  select id into v_ex_pu  from exercises where name = 'Pull-ups'               and split_id = '2day' and day = 2;
  select id into v_ex_dip from exercises where name = 'Dips'                   and split_id = '2day' and day = 2;
  select id into v_ex_bss from exercises where name = 'Bulgarian Split Squats' and split_id = '2day' and day = 2;

  if v_ex_sq is null or v_ex_bp is null or v_ex_rdl is null or v_ex_bor is null
     or v_ex_dl is null or v_ex_ohp is null or v_ex_pu is null or v_ex_dip is null or v_ex_bss is null then
    raise exception 'Seed exercises missing; ensure migrations 0001..0003 have been applied.';
  end if;

  -- Resolve set-template IDs
  select id into v_tpl_sq_top   from exercise_set_templates where exercise_id = v_ex_sq  and type = 'top_set';
  select id into v_tpl_sq_back  from exercise_set_templates where exercise_id = v_ex_sq  and type = 'backoff';
  select id into v_tpl_bp_top   from exercise_set_templates where exercise_id = v_ex_bp  and type = 'top_set';
  select id into v_tpl_bp_back  from exercise_set_templates where exercise_id = v_ex_bp  and type = 'backoff';
  select id into v_tpl_rdl      from exercise_set_templates where exercise_id = v_ex_rdl and type = 'normal';
  select id into v_tpl_bor      from exercise_set_templates where exercise_id = v_ex_bor and type = 'normal';
  select id into v_tpl_dl       from exercise_set_templates where exercise_id = v_ex_dl  and type = 'normal';
  select id into v_tpl_dl_back  from exercise_set_templates where exercise_id = v_ex_dl  and type = 'backoff';
  select id into v_tpl_ohp_top  from exercise_set_templates where exercise_id = v_ex_ohp and type = 'top_set';
  select id into v_tpl_ohp_back from exercise_set_templates where exercise_id = v_ex_ohp and type = 'backoff';
  select id into v_tpl_pu       from exercise_set_templates where exercise_id = v_ex_pu  and type = 'normal';
  select id into v_tpl_dip      from exercise_set_templates where exercise_id = v_ex_dip and type = 'normal';
  select id into v_tpl_bss      from exercise_set_templates where exercise_id = v_ex_bss and type = 'normal';

  if v_tpl_dl_back is null then
    raise exception 'Deadlift backoff template missing; ensure migration 0005 has been applied.';
  end if;

  -- ======================================================================
  -- W1: 2026-01-13 (Day 1)
  -- Notion: Squat (top set) 8x80kg | RDL 80kg | Bench 60kg | Bent-over Rows 50kg
  -- Only Squat top set has reps; RDL/Bench/BOR are weight-only → skipped.
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-01-13 12:00:00+00', '2026-01-13 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 8,    80,   false),
    (v_we_sq,  v_tpl_sq_back, 2, null, null, true),
    (v_we_sq,  v_tpl_sq_back, 3, null, null, true),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, null, null, true),
    (v_we_rdl, v_tpl_rdl,     2, null, null, true),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, null, null, true),
    (v_we_bor, v_tpl_bor,     2, null, null, true),
    (v_we_bor, v_tpl_bor,     3, null, null, true);

  -- ======================================================================
  -- W2: 2026-01-17 (Day 2)
  -- Notion: OHP top 6x50kg | OHP back-off 2x10@40kg
  --       | Deadlift 3x1@140kg | Deadlift back-off 2x8@90kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-01-17 12:00:00+00', '2026-01-17 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    140,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    140,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    140,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 8,    90,   false),
    (v_we_dl,  v_tpl_dl_back,  5, 8,    90,   false),
    (v_we_ohp, v_tpl_ohp_top,  1, 6,    50,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, 10,   40,   false),
    (v_we_ohp, v_tpl_ohp_back, 3, 10,   40,   false),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W3: 2026-01-19 (Day 1)
  -- Notion: Squat 6x85kg | Squat back-off 2x6@60kg
  --       | RDL (last set) 10x80kg            → slots 1-2 skipped, slot 3 logged
  --       | Bench 10x60kg, 8x60kg, 6x60kg     → top=10/60 (reps above target),
  --                                             backoff=8/60, 6/60
  --       | Bent-over Rows 10x55kg            → slot 1 only
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-01-19 12:00:00+00', '2026-01-19 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    85,   false),
    (v_we_sq,  v_tpl_sq_back, 2, 6,    60,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 6,    60,   false),
    (v_we_bp,  v_tpl_bp_top,  1, 10,   60,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 8,    60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 6,    60,   false),
    (v_we_rdl, v_tpl_rdl,     1, null, null, true),
    (v_we_rdl, v_tpl_rdl,     2, null, null, true),
    (v_we_rdl, v_tpl_rdl,     3, 10,   80,   false),
    (v_we_bor, v_tpl_bor,     1, 10,   55,   false),
    (v_we_bor, v_tpl_bor,     2, null, null, true),
    (v_we_bor, v_tpl_bor,     3, null, null, true);

  -- ======================================================================
  -- W4: 2026-01-23 (Day 2)
  -- Notion: OHP 6x55kg | Deadlift 145kg (weight only → skipped)
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-01-23 12:00:00+00', '2026-01-23 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, null, null, true),
    (v_we_dl,  v_tpl_dl,       2, null, null, true),
    (v_we_dl,  v_tpl_dl,       3, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  4, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  5, null, null, true),
    (v_we_ohp, v_tpl_ohp_top,  1, 6,    55,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W5: 2026-01-27 (Day 1)
  -- Notion: Squat 6x90kg | Squat back-off 2x10@70kg
  --       | RDL 3x10@85kg | Bench 8x60kg, 6x60kg, 3x60kg (red — struggle)
  --       | Bent-over Rows 10x60kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-01-27 12:00:00+00', '2026-01-27 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    90,   false),
    (v_we_sq,  v_tpl_sq_back, 2, 10,   70,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 10,   70,   false),
    (v_we_bp,  v_tpl_bp_top,  1, 8,    60,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 6,    60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 3,    60,   false),
    (v_we_rdl, v_tpl_rdl,     1, 10,   85,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   85,   false),
    (v_we_rdl, v_tpl_rdl,     3, 10,   85,   false),
    (v_we_bor, v_tpl_bor,     1, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     2, null, null, true),
    (v_we_bor, v_tpl_bor,     3, null, null, true);

  -- ======================================================================
  -- W6: 2026-01-30 (Day 2)
  -- Notion: OHP top 6x40kg (failed 60kg at 1r) | Deadlift 3x1@150kg
  --       | Deadlift back-off 2x5@100kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-01-30 12:00:00+00', '2026-01-30 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    150,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    150,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    150,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 5,    100,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 5,    100,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, 6,    40,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W7: 2026-02-03 (Day 1)
  -- Notion: Squat 6x95kg | Squat back-off 2x10@80kg
  --       | RDL 3x10@95kg (last set barely)
  --       | Bent-over Rows 3x10@65kg (barely, poor form)
  --       | Bench: not logged → skipped
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-02-03 12:00:00+00', '2026-02-03 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    95,   false),
    (v_we_sq,  v_tpl_sq_back, 2, 10,   80,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 10,   80,   false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, 10,   95,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   95,   false),
    (v_we_rdl, v_tpl_rdl,     3, 10,   95,   false),
    (v_we_bor, v_tpl_bor,     1, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   65,   false);

  -- ======================================================================
  -- W8: 2026-02-06 (Day 2)
  -- Notion: Deadlift 3x1@135kg (terrible) | OHP not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-02-06 12:00:00+00', '2026-02-06 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    135,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    135,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    135,  false),
    (v_we_dl,  v_tpl_dl_back,  4, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  5, null, null, true),
    (v_we_ohp, v_tpl_ohp_top,  1, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W9: 2026-02-10 (Day 1)
  -- Notion: Squat 6x100kg | Squat back-off 2x10@85kg
  --       | RDL 2x6@100kg (slots 1-2 filled, slot 3 skip)
  --       | Bent-over Rows 3x10@65kg | Bench not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-02-10 12:00:00+00', '2026-02-10 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    100,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 10,   85,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 10,   85,   false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, 6,    100,  false),
    (v_we_rdl, v_tpl_rdl,     2, 6,    100,  false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   65,   false);

  -- ======================================================================
  -- W10: 2026-02-13 (Day 2)
  -- Notion: Deadlift 3x130 (faila 160 pa 150) backoff 2x10@100kg
  --   Interpreted: 3 deadlift sets at 130 kg, 1 rep each (deadlift convention),
  --   plus 2 backoff sets of 10 reps @ 100 kg.
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-02-13 12:00:00+00', '2026-02-13 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    130,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    130,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    130,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 10,   100,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 10,   100,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W11: 2026-02-16 (Day 1)
  -- Notion: Squat 6x105kg | Squat back-off 2x10@90kg
  --       | RDL 2x10@100kg | Bent-over Rows 3x10@65kg | Bench not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-02-16 12:00:00+00', '2026-02-16 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    105,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 10,   90,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 10,   90,   false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, 10,   100,  false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   100,  false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   65,   false);

  -- ======================================================================
  -- W12: 2026-02-20 (Day 2)
  -- Notion: Deadlift 3x1@155kg / 2x10@105kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-02-20 12:00:00+00', '2026-02-20 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    155,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    155,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    155,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 10,   105,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 10,   105,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W13: 2026-02-24 (Day 1)
  -- Notion: Squat 6x110kg | Squat back-off 2x10@90kg
  --       | RDL 2x105 (smanji kg, popravi teh)  → no rep info, all RDL slots skipped
  --       | Bent-over Rows 3x10@65kg | Bench not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-02-24 12:00:00+00', '2026-02-24 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 6,    110,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 10,   90,   false),
    (v_we_sq,  v_tpl_sq_back, 3, 10,   90,   false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, null, null, true),
    (v_we_rdl, v_tpl_rdl,     2, null, null, true),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   65,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   65,   false);

  -- ======================================================================
  -- W14: 2026-02-26 (Day 2)
  -- Notion: Deadlift 3x1@160kg / 2x6@110kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-02-26 12:00:00+00', '2026-02-26 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    160,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    160,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    160,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 6,    110,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 6,    110,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W15: 2026-03-03 (Day 1)
  -- Notion: Squat 3x130kg | Squat back-off 6x110kg / 4x110kg
  --       | RDL 2x10@60kg (slots 1-2 filled, slot 3 skip)
  --       | Bent-over Rows 3x10@60kg | Bench not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-03-03 12:00:00+00', '2026-03-03 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 3,    130,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 6,    110,  false),
    (v_we_sq,  v_tpl_sq_back, 3, 4,    110,  false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, 10,   60,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   60,   false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   60,   false);

  -- ======================================================================
  -- W16: 2026-03-06 (Day 2)
  -- Notion: Deadlift "1x 165, druga fail, treca 155 fail"
  --   Interpreted: slot 1 = 1 rep × 165 kg; slot 2 (2nd attempt failed) skipped;
  --   slot 3 (3rd attempt at 155 also failed) skipped.
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-03-06 12:00:00+00', '2026-03-06 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    165,  false),
    (v_we_dl,  v_tpl_dl,       2, null, null, true),
    (v_we_dl,  v_tpl_dl,       3, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  4, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  5, null, null, true),
    (v_we_ohp, v_tpl_ohp_top,  1, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 2, null, null, true),
    (v_we_ohp, v_tpl_ohp_back, 3, null, null, true),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W17: 2026-03-31 (Day 1)
  -- Notion: Squat 3x130kg | Squat back-off 2x8@100kg
  --       | RDL 2x10@80kg | Bench / Bent-over Rows not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-03-31 12:00:00+00', '2026-03-31 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 3,    130,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 8,    100,  false),
    (v_we_sq,  v_tpl_sq_back, 3, 8,    100,  false),
    (v_we_bp,  v_tpl_bp_top,  1, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 2, null, null, true),
    (v_we_bp,  v_tpl_bp_back, 3, null, null, true),
    (v_we_rdl, v_tpl_rdl,     1, 10,   80,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   80,   false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, null, null, true),
    (v_we_bor, v_tpl_bor,     2, null, null, true),
    (v_we_bor, v_tpl_bor,     3, null, null, true);

  -- ======================================================================
  -- W18: 2026-04-07 (Day 1)
  -- Notion: Bench top 1x6@70kg | Bench back-off 10x60kg / 7x60kg
  --       | Squat top 4x130kg | Squat back-off 2x8@110kg
  --       | RDL 2x10@50kg | Barbell Row 3x10@60kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-04-07 12:00:00+00', '2026-04-07 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 4,    130,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 8,    110,  false),
    (v_we_sq,  v_tpl_sq_back, 3, 8,    110,  false),
    (v_we_bp,  v_tpl_bp_top,  1, 6,    70,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 10,   60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 7,    60,   false),
    (v_we_rdl, v_tpl_rdl,     1, 10,   50,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   50,   false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   60,   false);

  -- ======================================================================
  -- W19: 2026-04-09 (Day 2)
  -- Notion: Deadlift 3x1@165kg / 2x6@115kg
  --       | OHP "Top: 6x50kg / 2x10@40kg"
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-04-09 12:00:00+00', '2026-04-09 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 1,    165,  false),
    (v_we_dl,  v_tpl_dl,       2, 1,    165,  false),
    (v_we_dl,  v_tpl_dl,       3, 1,    165,  false),
    (v_we_dl,  v_tpl_dl_back,  4, 6,    115,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 6,    115,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, 6,    50,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, 10,   40,   false),
    (v_we_ohp, v_tpl_ohp_back, 3, 10,   40,   false),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W20: 2026-04-13 (Day 1)
  -- Notion: Bench top 1x6@75kg | Bench back-off 10x60kg / 8x60kg
  --       | Barbell Row 3x10@60kg | Squat / RDL not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-04-13 12:00:00+00', '2026-04-13 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, null, null, true),
    (v_we_sq,  v_tpl_sq_back, 2, null, null, true),
    (v_we_sq,  v_tpl_sq_back, 3, null, null, true),
    (v_we_bp,  v_tpl_bp_top,  1, 6,    75,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 10,   60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 8,    60,   false),
    (v_we_rdl, v_tpl_rdl,     1, null, null, true),
    (v_we_rdl, v_tpl_rdl,     2, null, null, true),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   60,   false);

  -- ======================================================================
  -- W21: 2026-04-21 (Day 1)
  -- Notion: Bench top 1x6@75kg | Bench back-off 2x10@60kg
  --       | RDL 2x10@50kg | Barbell Row 3x10@60kg | Squat not logged
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-04-21 12:00:00+00', '2026-04-21 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, null, null, true),
    (v_we_sq,  v_tpl_sq_back, 2, null, null, true),
    (v_we_sq,  v_tpl_sq_back, 3, null, null, true),
    (v_we_bp,  v_tpl_bp_top,  1, 6,    75,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 10,   60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 10,   60,   false),
    (v_we_rdl, v_tpl_rdl,     1, 10,   50,   false),
    (v_we_rdl, v_tpl_rdl,     2, 10,   50,   false),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     2, 10,   60,   false),
    (v_we_bor, v_tpl_bor,     3, 10,   60,   false);

  -- ======================================================================
  -- W22: 2026-04-23 (Day 2)
  -- Notion: OHP 6x55kg / 2x10@45kg  (first chunk → top, second → backoff)
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-04-23 12:00:00+00', '2026-04-23 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, null, null, true),
    (v_we_dl,  v_tpl_dl,       2, null, null, true),
    (v_we_dl,  v_tpl_dl,       3, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  4, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  5, null, null, true),
    (v_we_ohp, v_tpl_ohp_top,  1, 6,    55,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, 10,   45,   false),
    (v_we_ohp, v_tpl_ohp_back, 3, 10,   45,   false),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W23: 2026-04-30 (Day 2)
  -- Notion: Deadlift 1x3@170kg (slot 1 only) / backoff 2x6@120kg
  --       | OHP 4x60kg / 10x50kg / 6x50kg  (top + 2 backoff)
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-04-30 12:00:00+00', '2026-04-30 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 3,    170,  false),
    (v_we_dl,  v_tpl_dl,       2, null, null, true),
    (v_we_dl,  v_tpl_dl,       3, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  4, 6,    120,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 6,    120,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, 4,    60,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, 10,   50,   false),
    (v_we_ohp, v_tpl_ohp_back, 3, 6,    50,   false),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);

  -- ======================================================================
  -- W24: 2026-04-05 (Day 1)
  -- NOTE: this entry appears out of chronological order in the Notion source
  -- (between 30.4.2026. and 11.5.2026.). It's recorded here as written in
  -- Notion (5.4.2026 = 5 April 2026) — likely a typo for 5 May 2026, but
  -- kept as-is to match the source. Adjust by hand if needed.
  -- Notion: Squat top 1x130kg | Squat back-off 2x8@110kg
  --       | Bench top 1x6@75kg | Bench back-off 2x10@60kg
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 1, '2026-04-05 12:00:00+00', '2026-04-05 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_sq,  1) returning id into v_we_sq;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bp,  2) returning id into v_we_bp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_rdl, 3) returning id into v_we_rdl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bor, 4) returning id into v_we_bor;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_sq,  v_tpl_sq_top,  1, 1,    130,  false),
    (v_we_sq,  v_tpl_sq_back, 2, 8,    110,  false),
    (v_we_sq,  v_tpl_sq_back, 3, 8,    110,  false),
    (v_we_bp,  v_tpl_bp_top,  1, 6,    75,   false),
    (v_we_bp,  v_tpl_bp_back, 2, 10,   60,   false),
    (v_we_bp,  v_tpl_bp_back, 3, 10,   60,   false),
    (v_we_rdl, v_tpl_rdl,     1, null, null, true),
    (v_we_rdl, v_tpl_rdl,     2, null, null, true),
    (v_we_rdl, v_tpl_rdl,     3, null, null, true),
    (v_we_bor, v_tpl_bor,     1, null, null, true),
    (v_we_bor, v_tpl_bor,     2, null, null, true),
    (v_we_bor, v_tpl_bor,     3, null, null, true);

  -- ======================================================================
  -- W25: 2026-05-11 (Day 2)
  -- Notion (table): Deadlift "1x3@175kg /1x8@120/1x10@120"
  --   → normal slot 1 = 3 reps × 175 kg; normal slots 2-3 skipped (only 1 heavy
  --     single recorded). Backoff slots = 8/120 and 10/120 (the "1x8@120" and
  --     "1x10@120" chunks, kg inferred from context).
  -- Notion (free text below table, same date):
  --   "ohp top set 1x4rx60kg"            → OHP top 1 set × 4 reps × 60 kg
  --   "ohb backoff 10x50kg / 8x50kg"     → OHP backoff 10/50, 8/50
  -- ======================================================================
  insert into workouts (user_id, split_id, day, created_at, updated_at)
    values (v_user_id, '2day', 2, '2026-05-11 12:00:00+00', '2026-05-11 12:00:00+00')
    returning id into v_workout_id;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dl,  1) returning id into v_we_dl;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_ohp, 2) returning id into v_we_ohp;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_pu,  3) returning id into v_we_pu;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_dip, 4) returning id into v_we_dip;
  insert into workout_exercises (workout_id, exercise_id, order_index) values (v_workout_id, v_ex_bss, 5) returning id into v_we_bss;
  insert into sets (workout_exercise_id, set_template_id, order_index, reps, weight, is_skipped) values
    (v_we_dl,  v_tpl_dl,       1, 3,    175,  false),
    (v_we_dl,  v_tpl_dl,       2, null, null, true),
    (v_we_dl,  v_tpl_dl,       3, null, null, true),
    (v_we_dl,  v_tpl_dl_back,  4, 8,    120,  false),
    (v_we_dl,  v_tpl_dl_back,  5, 10,   120,  false),
    (v_we_ohp, v_tpl_ohp_top,  1, 4,    60,   false),
    (v_we_ohp, v_tpl_ohp_back, 2, 10,   50,   false),
    (v_we_ohp, v_tpl_ohp_back, 3, 8,    50,   false),
    (v_we_pu,  v_tpl_pu,       1, null, null, true),
    (v_we_pu,  v_tpl_pu,       2, null, null, true),
    (v_we_pu,  v_tpl_pu,       3, null, null, true),
    (v_we_dip, v_tpl_dip,      1, null, null, true),
    (v_we_dip, v_tpl_dip,      2, null, null, true),
    (v_we_dip, v_tpl_dip,      3, null, null, true),
    (v_we_bss, v_tpl_bss,      1, null, null, true),
    (v_we_bss, v_tpl_bss,      2, null, null, true);
end $$;

commit;

-- ============================================================================
-- Sanity-check queries — run after the transaction commits.
-- ============================================================================
-- 1) Per-workout summary (expect 25 rows; day-1 → exercises=4, day-2 → exercises=5):
--
-- select date_trunc('day', w.created_at)::date as day,
--        w.day as split_day,
--        (select count(*) from workout_exercises we where we.workout_id = w.id) as exercises,
--        (select count(*) from sets s
--           join workout_exercises we on s.workout_exercise_id = we.id
--          where we.workout_id = w.id and not s.is_skipped) as logged_sets
--   from workouts w
--  where w.user_id = (select id from auth.users where email = 'budsigur@gmail.com')
--  order by w.created_at;
--
-- 2) Constraint sanity (must return 0):
--
-- select count(*) from sets
--  where not is_skipped
--    and (reps is null or reps < 1 or weight is null or weight <= 0);
