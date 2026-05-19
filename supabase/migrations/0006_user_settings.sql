-- Per-user settings. Currently holds the weight increment used to pre-fill
-- working-set weights in the guided entry flow when the user hit the top of
-- their rep range last session. See SPEC.md §17 → "Configurable rounding".
--
-- One row per user, keyed on auth.users(id). No row is created until the user
-- explicitly changes a setting; reads fall back to defaults in app code.

create table if not exists user_settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  weight_increment numeric(3,1) not null default 2.5
    check (weight_increment in (2.5, 5.0)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at trigger (mirrors workouts/sets behavior).
create or replace function user_settings_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function user_settings_set_updated_at();

alter table user_settings enable row level security;

drop policy if exists "Users can view own settings" on user_settings;
create policy "Users can view own settings"
  on user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on user_settings;
create policy "Users can insert own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on user_settings;
create policy "Users can update own settings"
  on user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy — auth.users cascade handles cleanup.
