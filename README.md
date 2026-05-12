# LOG

Personal workout logger. 2-day split, guided set-by-set entry, warmup suggestions, basic analytics.

Built per [SPEC.md](SPEC.md). Stack: Next.js 15 (App Router) · Supabase · Tailwind v4 · Recharts.

## Setup

### 1. Supabase

Either point at a hosted Supabase project or run `supabase start` locally.

```bash
supabase link --project-ref <your-ref>   # for hosted
supabase db push                          # apply migrations + seed
```

See [`supabase/README.md`](supabase/README.md) for details.

### 2. Environment

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY is only needed to run the integration test
```

### 3. Install & run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts

| Command          | What it does                                  |
|------------------|-----------------------------------------------|
| `pnpm dev`       | Next dev server                               |
| `pnpm build`     | Production build                              |
| `pnpm start`     | Run the production build                      |
| `pnpm typecheck` | `tsc --noEmit`                                |
| `pnpm test`      | Vitest (unit always; integration only with `SUPABASE_SERVICE_ROLE_KEY` set) |
| `pnpm lint`      | Next/ESLint                                   |

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo on Vercel.
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Add a build step to apply migrations (`supabase db push`) or run them manually before deploy.
5. Deploy.

## Project layout

```
app/                              # Next App Router
  (auth)/                          # /login, /signup, /reset-password
  (app)/                           # post-auth shell (top nav + bottom tabs)
    workouts/                      # list, [id], new, [id]/edit
    analytics/                     # /analytics
    profile/                       # /profile
  auth/callback/                   # OAuth/reset code exchange
src/
  actions/                         # server actions (save/update/delete, signOut)
  components/                      # UI: entry/, workouts/, analytics/, nav/
  lib/
    domain/                        # types, sets, warmup, analytics (pure logic)
    db/queries.ts                  # typed Supabase queries
    entry/reducer.ts               # guided-entry state machine
    supabase/                      # client/server/middleware factories
middleware.ts                      # auth redirect logic
supabase/migrations/               # schema, RLS, seed, RPCs
tests/                             # unit + integration + RLS checklist
```

## Testing

Pure logic is covered by Vitest. The save flow has an integration test that talks to a real local Supabase instance. The RLS policies are verified manually — see [tests/RLS-CHECKLIST.md](tests/RLS-CHECKLIST.md).

```bash
# Unit tests only (always run):
pnpm test

# With integration tests (requires `supabase start` + env vars):
SUPABASE_SERVICE_ROLE_KEY=… pnpm test
```
