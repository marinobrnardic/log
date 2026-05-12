# Supabase setup

Migrations under `migrations/` are applied in lexical order. They are idempotent and safe to re-run.

## First-time setup

```bash
# Install the CLI once
brew install supabase/tap/supabase

# Link to your cloud project (or `supabase start` for local)
supabase link --project-ref <your-ref>

# Apply migrations
supabase db push
```

## Local development

```bash
supabase start         # spins up local postgres + auth + studio
supabase db reset      # re-runs all migrations against the local db
```

The local `supabase status` output prints the anon and service-role keys for `.env.local`.

## Regenerate TypeScript types

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Run this whenever a migration changes the schema.

## Migration order

1. `0001_schema.sql` — tables, constraints, indexes
2. `0002_rls.sql` — row-level security policies (per SPEC.md §12)
3. `0003_seed.sql` — 2-day split, exercises, set templates (idempotent)
4. `0004_save_workout_rpc.sql` — `save_workout` and `update_workout_sets` functions
