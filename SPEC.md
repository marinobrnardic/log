# Workout Logger App — Product & Technical Spec (v1)

---

## 1. Overview

A simple personal workout logging web app with:

* A predefined 2-day exercise split
* Structured set types (top set, back-off, normal)
* Warmup guidance based on previous performance
* Basic progress analytics

### Goals

* Extremely fast workout logging
* Structured strength training tracking
* Clean, repeatable workouts

### Non-Goals (v1)

* Custom exercises
* Social features
* Advanced analytics

---

## 2. Tech Stack

### Frontend

* Next.js (App Router)
* React
* Tailwind CSS
* Recharts (for analytics graphs)
* Lucide React (for icons)
* Inter font (loaded via `next/font`)

### Backend

* Supabase (Postgres + Auth)

### Hosting

* Vercel

---

## 3. Core Features

### Authentication

* Email + password login/signup
* Persistent sessions
* Password reset via email

### Workouts

* Create workout by selecting:
  * Day (A / B)
* **Day preview**: selecting a day shows the list of exercises before confirming
* **Guided entry flow**: after confirming the day, the user logs the workout one set at a time (see Section 9 for full flow). At the end, a recap is shown and the workout is saved with a single action.
* View workout history (sorted newest first)
* View workout detail (read-only recap)
* Edit workout (re-runs the guided flow with values prefilled; weight/reps only)
* Delete workout (with confirmation dialog)

### Logging

* Exercises and sets are derived from templates on day selection
* User logs:
  * Weight (kg, decimals allowed)
  * Reps (integer only)
* Sets are pre-generated and fixed in count
* Set data is **buffered client-side** during the guided entry flow. No `workouts`, `workout_exercises`, or `sets` rows exist in the database until the user clicks **Save Workout** on the recap screen. Closing the browser or navigating away mid-flow discards all in-progress data.
* **Warmup guidance**: for selected exercises, suggested warmup sets are displayed based on the user's last performance (not logged or saved)

### Analytics

* Dedicated `/analytics` page
* Two progress views per main lift (Squat, Bench Press, Deadlift, Overhead Press) — Top Set Weight and Estimated 1RM — presented as tabs

---

## 4. Data Model

> Persistence timing is defined in §3 → Logging. For the **edit** flow, existing `sets` rows are `UPDATE`d in place; no new `workouts` or `workout_exercises` rows are created.

### Day Mapping

| UI Label | DB `day` value |
|----------|---------------|
| A        | 1             |
| B        | 2             |

---

### exercise_splits

```sql
id   TEXT PRIMARY KEY;
name TEXT;
```

---

### exercises

```sql
id           UUID PRIMARY KEY;
name         TEXT;
split_id     TEXT REFERENCES exercise_splits(id);
day          INT;        -- 1 or 2
order_index  INT;
notes        TEXT;
is_active    BOOLEAN DEFAULT true;
```

---

### exercise_set_templates

```sql
id               UUID PRIMARY KEY;
exercise_id      UUID REFERENCES exercises(id);
type             TEXT;  -- 'top_set' | 'backoff' | 'normal'
order_index      INT;
target_reps_min  INT;
target_reps_max  INT;
default_sets     INT;
notes            TEXT;
```

---

### workouts

```sql
id         UUID PRIMARY KEY;
user_id    UUID REFERENCES auth.users(id);
split_id   TEXT REFERENCES exercise_splits(id);
day        INT;
created_at TIMESTAMP DEFAULT now();
updated_at TIMESTAMP DEFAULT now();
```

> Workout date is always `created_at`.

---

### workout_exercises

```sql
id          UUID PRIMARY KEY;
workout_id  UUID REFERENCES workouts(id) ON DELETE CASCADE;
exercise_id UUID REFERENCES exercises(id);
order_index INT;
```

---

### sets

```sql
id                  UUID PRIMARY KEY;
workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE;
set_template_id     UUID REFERENCES exercise_set_templates(id);
order_index         INT;       -- required for ordered rendering
reps                INT;       -- nullable until logged
weight              FLOAT;     -- kg, nullable until logged
is_skipped          BOOLEAN DEFAULT false;
created_at          TIMESTAMP DEFAULT now();
updated_at          TIMESTAMP DEFAULT now();
```

> No new tables are required for warmups or analytics — both are computed from existing `sets` data.

---

## 5. Set Rules

### Fixed Sets Only

* Each exercise has a fixed number of sets derived from `default_sets`
* If a range exists (e.g. 2–3) → use the higher number

### No Dynamic Behavior

Not allowed:

* Adding sets
* Removing sets

### Skipping Sets

* `is_skipped = true`
* Weight and reps become optional when skipped
* Set is visually greyed out; inputs disabled

### Validation

* `weight` and `reps` are **required** on submission unless `is_skipped = true`
* `weight`: float, must be > 0, in kg
* `reps`: integer, must be ≥ 1

---

## 6. Seed Data

### Splits

| id      | name        |
|---------|-------------|
| `2day`  | 2-Day Split |

---

### Day A (day = 1)

| order | Exercise        | Set Templates                                                                                       |
|-------|-----------------|------------------------------------------------------------------------------------------------------|
| 1     | Squat           | Top Set: 1 × 4–6 reps · Back-off: 2 × 6–10 reps                                                      |
| 2     | Bench Press     | Top Set: 1 × 4–6 reps · Back-off: 2 × 8–10 reps                                                      |
| 3     | RDL             | Normal: 3 × 6–10 reps                                                                                |
| 4     | Bent Over Rows  | Normal: 3 × 8–10 reps                                                                                |

### Day B (day = 2)

| order | Exercise               | Set Templates                                                            |
|-------|------------------------|---------------------------------------------------------------------------|
| 1     | Deadlift               | Normal: 3 × 1 rep (note: "@ 90% 1RM") · Back-off: 2 × 5–10 reps           |
| 2     | Overhead Press         | Top Set: 1 × 4–6 reps · Back-off: 2 × 6–10 reps                           |
| 3     | Pull-ups               | Normal: 3 × 8–10 reps                                                     |
| 4     | Dips                   | Normal: 3 × 8–10 reps                                                     |
| 5     | Bulgarian Split Squats | Normal: 2 × 8–10 reps                                                     |

---

### Seed SQL

Seed SQL lives in [supabase/migrations/0003_seed.sql](supabase/migrations/0003_seed.sql) and later migrations (e.g. `0005_deadlift_backoff_template.sql`). Update there, not here — the tables above are the human-readable view; the migrations are the source of truth.

---

## 7. Pages & Routing

| Route                  | Description                                                            | Auth Required |
|------------------------|------------------------------------------------------------------------|---------------|
| `/login`               | Login form                                                             | No            |
| `/signup`              | Signup form                                                            | No            |
| `/reset-password`      | Request password reset email                                           | No            |
| `/workouts`            | Workout history list                                                   | Yes           |
| `/workouts/new`        | Guided workout creation (day selection → set-by-set entry → recap → save) | Yes        |
| `/workouts/[id]`       | Workout detail (read-only recap)                                       | Yes           |
| `/workouts/[id]/edit`  | Edit workout (re-runs the guided flow with values prefilled)           | Yes           |
| `/analytics`           | Progress graphs for the big four lifts                                 | Yes           |
| `/profile`             | Account info, sign out, password reset                                 | Yes           |

* Unauthenticated users hitting any protected route are redirected to `/login`
* After login/signup, users are redirected to `/workouts`

---

## 8. Design Guidelines

### Design Principles

* **Content first** — strip everything that isn't logging or reading data
* **One-handed mobile** — every primary action reachable with a thumb
* **No decoration without function** — color, motion, and typography earn their place
* **Tabular alignment** — numbers (weight, reps, dates) use tabular figures
* **Speed over polish** — instant feedback, no unnecessary loading states or animations

### Theme

Dark mode only. No theme toggle in v1.

### Color Palette

| Token              | Hex        | Usage                                              |
|--------------------|------------|---------------------------------------------------|
| `bg-base`          | `#0A0A0A`  | Page background                                   |
| `bg-surface`       | `#18181B`  | Cards, inputs, raised surfaces                    |
| `bg-surface-2`     | `#27272A`  | Hover states, secondary surfaces                  |
| `border`           | `#27272A`  | Dividers, input borders                           |
| `text-primary`     | `#FAFAFA`  | Body text, headers                                |
| `text-secondary`   | `#A1A1AA`  | Labels, metadata, secondary info                  |
| `text-muted`       | `#71717A`  | Disabled, placeholders, skipped states            |
| `accent`           | `#22C55E`  | Primary actions, active states, data points       |
| `accent-hover`     | `#16A34A`  | Pressed/hover for accent                          |
| `accent-text`      | `#0A0A0A`  | Text on green backgrounds                         |
| `destructive`      | `#EF4444`  | Delete actions, errors                            |

### Typography

* **Font**: Inter, with system fallback: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
* **Numerals**: `font-variant-numeric: tabular-nums` on all weight/reps/date displays
* **Weights used**: 400 (regular), 500 (medium), 600 (semibold). No bold (700+).

| Style    | Size | Weight | Usage                            |
|----------|------|--------|----------------------------------|
| Display  | 32px | 600    | Page titles                      |
| Title    | 24px | 600    | Section headers, exercise names  |
| Body     | 16px | 400    | Default text, inputs             |
| Caption  | 14px | 400    | Labels, metadata                 |
| Small    | 12px | 500    | Tags, badges                     |

### Spacing & Layout

* **Base unit**: 4px (Tailwind default)
* **Page horizontal padding**: 16px on mobile, 24px on tablet+
* **Max content width**: 640px (centered on larger screens)
* **Bottom safe area**: account for bottom tab bar (~64px) plus iOS `safe-area-inset-bottom`
* **Touch targets**: minimum 44 × 44px

### Components

This section captures UX *intent* and decisions that aren't visible from the code (states, behaviors, ARIA contracts). Exact Tailwind classes, paddings, and color tokens live in the components themselves — change them there, not here.

#### Buttons

* **Primary**: accent background, accent-text foreground. Full-width on mobile for form actions. Min height 44px.
* **Secondary**: transparent with `border`, primary text.
* **Destructive**: transparent, `text-destructive` — only for delete, always paired with the confirmation dialog.

#### Inputs (Weight & Reps)

* `inputMode="decimal"` for weight, `inputMode="numeric"` for reps. No native number spinners.
* Large, centered text — legible while training. Tabular numerals.
* Placeholder shows the target rep range as a hint (e.g. "4–6").

#### Set Row

```
[Set Label]              [Skip]
[ Weight (kg) ]  [ Reps ]
```

* Label on top, includes set type (Top Set / Back-off 1 / etc.).
* Skip toggle reads **"Skip"** when inactive; flips to **"Undo skip"** with a `RotateCcw` icon when active — so it clearly invites a reversal, rather than reading as a static "Skipped" badge.
* Skipped state: row at 50% opacity, input area replaced with a centered "Skipped" placeholder + hint sub-line ("Tap 'Undo skip' above to enter values.").

#### Set Progress (Guided Entry)

Because only one set is on screen at a time, progress is shown at the top of the entry screen rather than per-exercise:

```
Squat — Top Set                    Set 1 / 12
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

* Header: `[Exercise Name] — [Set Type]` (left) and `Set X / Y` counter (right).
* `Y` is the total count of **working** sets across the workout — warmups do not count.
* On the recap screen the bar is full and reads `Set Y / Y`.

#### Sticky Footer (shared)

Used by the Set Entry, Recap, and Workout Detail screens. Pinned to the bottom of the viewport above the bottom tab bar (`bottom: calc(64px + env(safe-area-inset-bottom))`) so the primary action is always thumb-reachable regardless of content height. Two buttons split equally, secondary left, primary right, each meeting the 44px touch-target minimum.

#### Set Entry Screen

Single screen, one working set at a time. Layout top to bottom:

1. **Set Progress** header
2. **Warmup section** — only for the big four lifts, only on the *first working set* of that exercise, only if prior data exists (see §10)
3. **Set inputs** (weight, reps)
4. **Skip toggle** (top-right of input row)
5. **Validation helper** — when the user has touched a field but the set is not yet valid, one line of `text-muted` text appears: "Enter weight and reps, or tap Skip." Suppressed before any interaction (no pre-emptive nagging).
6. **Sticky footer** — `Back` (secondary) and `Next Set` (primary). On the final set, `Next Set` is replaced with `Review`. `Back` is natively disabled on the first set.

**Validation gate (canonical):** while either weight or reps is invalid (and the set is not skipped), the primary button is visually dimmed and carries `aria-disabled="true"` — but **remains tappable**. Tapping the dimmed button focuses the first empty input rather than failing silently (a silent disabled button confuses users mid-workout). Once both inputs are valid (or the set is skipped), the button reaches its full-color, fully-active state.

#### Recap Screen

Shown after the user clears the final set. Layout:

1. Heading: "Review your workout", with a sub-line: "Tap any set to edit." — signals that rows below are interactive.
2. Per exercise in `order_index` order: exercise name, then one row per set in `order_index` order. Each row is a 44px button with the set type label on the left, `[weight × reps]` (or "Skipped") on the right, and a small chevron suggesting tap-ability. Skipped rows render at 50% opacity.
3. **Sticky footer** — `Back` (returns to the final set with values preserved) and `Save Workout`.

**Edit-from-recap mode:** tapping a recap row jumps to that specific set in the entry flow with values preserved. In this mode:

* The primary footer button is relabeled **Done** (in place of `Next Set` / `Review`).
* Tapping **Done** returns directly to the recap — the user is **not** stepped through subsequent sets.
* `Back` still moves to the previous set if the user wants to fix an adjacent entry; the mode persists, so a later `Done` still returns to the recap.

The mode clears as soon as the user lands back on the recap. Re-entering edit on a different row starts a fresh session.

#### Day Picker (Workout Creation)

Two large buttons (A / B), full-width. Selected state shows an accent border + accent text and reveals a list of exercise names below. A `Start Workout` primary button confirms the selection and enters the guided flow.

#### Workout History List Item

Card with the workout date (Title size, tabular numerals) on top and `Split name · Day label` (caption, `text-secondary`) below — see "Date Formatting" below for the exact date format.

#### Tabs

A horizontal tab bar used to switch between sibling views on the same page (currently only `/analytics`).

* Active tab: accent bottom border, primary text. Inactive: muted text, no border.
* **Sticky** below the top nav so it remains visible while scrolling long panels.
* Horizontal scroll if tabs overflow. 44px min height per tab.
* ARIA: `role="tablist"`, `role="tab"` + `aria-selected` + `aria-controls`, `role="tabpanel"` + `aria-labelledby`.

#### Confirmation Dialog

Shared pattern for the discard-workout dialog (see "Leaving the Guided Flow" below) and the delete-workout dialog (§9 → Workout Detail).

* Rendered into `document.body` via React portal — escapes sticky footers, tab bars, and any local stacking context that would otherwise clip the dialog.
* Centered on all viewports, sits above the sticky entry/recap footer and the bottom tab bar.
* Body scroll is locked while the dialog is open; the prior value is restored on close.
* Two actions, right-aligned: **Cancel** (secondary) on the left, primary action on the right — accent style for non-destructive confirmations, destructive style for delete.
* `role="dialog"` + `aria-modal="true"`.
* In-flight state: while the primary action is pending, both buttons are disabled and the primary label switches to a verb form ("Deleting…").

#### Analytics Graphs

Recharts `<LineChart>`, one accent line per chart, subtle dashed gridlines, no legend. Empty state: centered muted text.

### Navigation

#### Top Navigation Bar

Fixed top, ~56px tall. Left-corner "LOG" wordmark links to `/workouts`. Visible on all authenticated routes; hidden on auth screens (`/login`, `/signup`, `/reset-password`).

#### Bottom Tab Bar

| Tab        | Icon (Lucide)  | Route          |
|------------|----------------|----------------|
| Workouts   | `Dumbbell`     | `/workouts`    |
| Analytics  | `LineChart`    | `/analytics`   |
| Profile    | `User`         | `/profile`     |

Fixed bottom, ~64px tall, accounts for `safe-area-inset-bottom`. Active tab uses accent; inactive uses muted. Hidden on auth screens.

#### New Workout Button

Full-width primary button pinned to the bottom of `/workouts` only, above the bottom tab bar, always thumb-reachable.

#### Leaving the Guided Flow

During the guided entry flow (`/workouts/new` past day selection, or `/workouts/[id]/edit`), tapping the logo, a bottom tab, or the browser back button shows a confirmation dialog: *"Discard this workout? Your progress will be lost."* Confirming discards client state and navigates away; cancelling keeps the user on the current set. The recap screen is treated identically — leaving without tapping **Save Workout** discards the workout.

> **Profile page (v1 minimum)**: shows the user's email, a sign-out button, and a "Reset password" link.

### Iconography

* Library: **Lucide React** (`lucide-react`)
* Stroke width: 1.75 (default)
* Sizes: **14–16px** for in-context affordances (e.g. row chevrons, icons next to short button labels); **20px** in tab bar and inline labels; **24px** for primary actions
* Always paired with a visible label or `aria-label`. Decorative icons that duplicate adjacent text use `aria-hidden="true"`.

### Date Formatting

All workout-date displays (history list item, workout detail header, edit header) share one format. The diff is computed from the **calendar day** of the workout vs. the current day — not a raw millisecond delta — so a workout logged at 23:50 reads as "Yesterday" by 00:10 the following morning, not "Today".

| Condition                          | Output                                                  |
|------------------------------------|---------------------------------------------------------|
| Same calendar day                  | `Today`                                                 |
| 1 day ago                          | `Yesterday`                                             |
| 2–7 days ago                       | `N days ago` (via `Intl.RelativeTimeFormat`)            |
| >7 days ago, same year             | `Mon, May 4` (weekday short + month short + day)        |
| Different year, or in the future   | `May 4, 2025` (month short + day + year)                |

The analytics chart X-axis uses a separate compact format: `May 4` (month short + day, no weekday, no year). All date displays render with `tabular-nums`.

### Motion

* Minimal — purpose-driven only
* **Duration**: 150ms (most transitions), 200ms (modal/sheet entrances)
* **Easing**: `ease-out` for enter, `ease-in` for exit
* No page-level transitions
* No loading spinners — use static "Loading..." text or skeleton states

### Accessibility

* WCAG AA contrast on all text/background combinations
* Minimum 44 × 44px touch targets for all interactive elements
* Focus rings: 2px `accent` outline (keyboard focus only)
* All icon-only buttons have `aria-label`; decorative icons use `aria-hidden="true"`
* Semantic HTML (`<main>`, `<nav>`, etc.)
* Form inputs always have associated `<label>` elements
* Validation-gated primary actions: see §8 → Set Entry Screen for the canonical contract.

### Don'ts

* No drop shadows, glassmorphism, or gradients
* No emoji as UI elements
* No animations on data load
* No additional accent colors — green is the only accent
* No light mode support in v1

---

## 9. UI Behavior (STRICT)

### Workout Creation (`/workouts/new`)

Three phases on a single route, advancing via in-page state. The visual contract for each screen lives in §8 → Components; the rules below cover only flow-level behavior.

**Phase 1 — Day Selection.** User picks Day A or B; an inline preview shows the exercise names for that day (order from `exercises.order_index`, names only). Tapping **Start Workout** loads exercises and templates into client state and enters Phase 2. No DB writes.

**Phase 2 — Guided Set-by-Set Entry.** Sets are ordered by exercise `order_index`, then template `order_index`. One working set on screen at a time. To advance, the user must either enter valid weight (> 0 kg) + reps (≥ 1) or toggle **Skip**. **Back** preserves values; **Next Set** becomes **Review** on the final set. Warmup guidance (§10) renders above the inputs on the first working set of a big-four lift when prior data exists. Validation-gate behavior: see §8 → Set Entry Screen.

**Phase 3 — Recap & Save.** Recap lists every exercise with each set's logged values (or "Skipped"). Tapping a row enters edit-from-recap mode (see §8 → Recap Screen). **Save Workout** issues one transaction that inserts a `workouts` row (`split_id = '2day'`, `day` from selection), a `workout_exercises` row per exercise in `order_index` order, and a `sets` row per working set carrying `reps`, `weight`, `is_skipped`, and `order_index`. On success redirects to `/workouts`; on failure the user stays on the recap with a non-blocking error and may retry.

---

### Workout History (`/workouts`)

Lists workouts newest first. Each entry shows **Split name · Day label · Date**. Empty state: message + **Start Workout** button. The fixed **New Workout** button sits at the bottom of the screen, above the tab bar, on every state of this page.

---

### Workout Detail (`/workouts/[id]`)

Read-only recap of a saved workout. Header matches the history-list-item hierarchy: workout date (Display size, tabular) on top, `Split name · Day label` below. The body uses the same layout as the Recap Screen (§8) minus the Save/Back buttons. **Sticky footer** (see §8 → Sticky Footer) holds **Delete** (left, destructive — opens the confirmation dialog) and **Edit** (right, accent — routes to `/workouts/[id]/edit`). The edit screen uses the same header. No warmup section — warmups are guidance for live entry only.

---

### Edit Workout (`/workouts/[id]/edit`)

Re-runs Phase 2 + Phase 3 with all set values preloaded. Day selection is skipped. Skip state is preserved and toggleable. Validation rules (§5) apply identically. **Save Workout** issues `UPDATE`s against existing `sets` rows — no new `workouts` or `workout_exercises` rows. Cancelling via the discard dialog leaves the saved workout untouched.

---

### Delete Workout

Confirmation dialog required. On confirm, the workout and all related records are deleted via cascade.

---

### User Actions

Allowed: enter weight + reps, skip/unskip, move forward/backward through sets, jump to a specific set from recap.

Not allowed: add or delete sets, modify exercise structure or order, log warmups, skip the recap (Save Workout is reachable only via the recap screen).

---

## 10. Warmup Logic

### Scope

Warmups are displayed for these exercises only:

* Squat
* Bench Press
* Overhead Press
* Deadlift

For all other exercises, no warmup section is rendered.

### Behavior

* Warmups are **guidance only** — not stored in the database, not editable, not logged
* Computed at render time on the workout detail screen
* If no previous data exists for the exercise, the warmup section is **hidden entirely**

### Constants

* **Empty bar weight**: `20 kg` (Olympic standard)
* **Rounding**: nearest `5 kg`
* **Floor**: any computed warmup weight below `20 kg` is clamped to `20 kg`

### Anchor Weight (the "100%" reference)

| Exercise         | Anchor source                                                                 |
|------------------|--------------------------------------------------------------------------------|
| Squat            | `weight` of the most recent logged top-set                                     |
| Bench Press      | `weight` of the most recent logged top-set                                     |
| Overhead Press   | `weight` of the most recent logged top-set                                     |
| Deadlift         | Implied 1RM = `last_working_weight / 0.9` (since working weight = 90% of 1RM)  |

For Deadlift, the "last working weight" is the weight of the most recent non-skipped Deadlift set.

### Warmup Progression

Given an `anchor` weight, generate four warmup sets:

| # | Weight                          | Reps   | Rest    |
|---|---------------------------------|--------|---------|
| 1 | Empty bar (20 kg)               | 10–15  | None    |
| 2 | `round_to_5(anchor × 0.50)`     | 5      | 1 min   |
| 3 | `round_to_5(anchor × 0.70)`     | 3      | 1–2 min |
| 4 | `round_to_5(anchor × 0.90)`     | 1      | 2 min   |

Where:

```
round_to_5(w) = max(20, round(w / 5) * 5)
```

### Warmup UI

Warmups render **above the set inputs on the first working set of the exercise** in the guided entry flow — i.e., they appear once per qualifying exercise, on the screen where the user logs that exercise's first working set, and are not shown again on subsequent sets of the same exercise.

```
Warmups (suggested)
─────────────────────
1. 20 kg × 10–15      (empty bar, no rest)
2. 60 kg × 5          (1 min rest)
3. 85 kg × 3          (1–2 min rest)
4. 110 kg × 1         (2 min rest)
─────────────────────
Top Set
[ weight (kg) | reps ]   [ Skip ]
```

Visually distinct from working sets (e.g. lighter background, no input fields). Not shown on the read-only workout detail screen or the recap screen.

---

## 11. Analytics

### Page

* Route: `/analytics`
* Visible only to authenticated users

### Scope

Graphs are shown for these four lifts only ("the big four"):

* Squat
* Bench Press
* Deadlift
* Overhead Press

### Graphs

The page contains **two tabs**, each with **four line graphs** (one per main lift). The tab bar uses the Tabs component (Section 8); only the active tab's graphs are rendered.

#### Tab 1 — Top Set Weight (default)

* X-axis: workout date
* Y-axis: weight (kg)
* Data point per workout:
  * Squat / Bench / OHP → weight of the top-set type set
  * Deadlift → heaviest non-skipped single in the workout

#### Tab 2 — Estimated 1RM

* X-axis: workout date
* Y-axis: estimated 1RM (kg)
* Formula: **Epley** — `1RM = weight × (1 + reps/30)`
* Data point per workout:
  * Squat / Bench / OHP → Epley applied to the top-set
  * Deadlift → Epley applied to the heaviest non-skipped single

### Exclusions

* Skipped sets are excluded from all calculations
* Workouts where the relevant exercise has no logged data produce no data point

### Empty States

* If a lift has no data yet: show empty graph with message "No data yet — complete a workout to see progress"

### Implementation Notes

* All metrics computed client-side from `sets` data joined through `workout_exercises` and `workouts`
* Use Recharts `<LineChart>` for visualization
* Default view: all-time data (time-period filtering deferred to future improvements)
* X-axis tick labels render as `May 4` (compact month + day, no year) — see §8 → Date Formatting

---

## 12. Row Level Security (RLS)

RLS is enabled on all user-data tables. `workouts` is owned directly by `user_id` (SELECT/INSERT/UPDATE/DELETE all gated on `auth.uid() = user_id`). `workout_exercises` and `sets` inherit ownership transitively through `workouts`. Read-only template tables (`exercises`, `exercise_splits`, `exercise_set_templates`) are readable by any authenticated user.

Policy definitions live in [supabase/migrations/0002_rls.sql](supabase/migrations/0002_rls.sql). Update there, not here.

Manual verification checklist after policy changes: [tests/RLS-CHECKLIST.md](tests/RLS-CHECKLIST.md).

---

## 13. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 14. Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

---

## 15. Testing Strategy

A pragmatic, lightweight approach — test where bugs are silent or expensive, skip where bugs are obvious in the UI.

### Tooling

* **Vitest** for unit and integration tests
* No E2E framework in v1 (Playwright / Cypress deferred)
* No component snapshot tests

### What Gets Tested

#### 1. Pure Logic (Unit Tests)

High value because bugs here silently produce wrong numbers.

* **Warmup calculation** (`getWarmupSets(anchor)`)
  * Returns four warmup sets with correct percentages (50%, 70%, 90%) + empty bar
  * Rounds to nearest 5 kg
  * Clamps to 20 kg minimum
  * Returns `null` / empty when anchor is missing
* **Anchor resolution** (`getAnchorWeight(exerciseName, history)`)
  * Squat / Bench / OHP → most recent top-set weight
  * Deadlift → `last_working_weight / 0.9`
  * Returns `null` when no history exists
* **Epley 1RM** (`estimate1RM(weight, reps)`)
  * `weight × (1 + reps/30)` for valid inputs
  * Handles edge cases (reps = 1, reps = 0)

#### 2. Save Workout Flow (Integration Test)

One test against a Supabase test instance (or mocked client) confirming that, given a completed in-memory Day A workout, tapping **Save Workout** inserts:

* 1 `workouts` row with correct `day` and `split_id`
* 4 `workout_exercises` rows in correct order
* Correct number of `sets` rows per exercise (1+2 for Squat, 1+2 for Bench, 3 for RDL, 3 for Bent Over Rows)
* All sets carry the correct `reps`, `weight`, `is_skipped`, and `order_index`

Same for Day B. Also assert: no rows are inserted prior to the Save action being invoked.

#### 3. RLS Verification (Manual Checklist)

Documented manual test, run once after deployment and after any RLS policy change:

* Create two test users (A and B)
* User A creates a workout
* Confirm User B cannot:
  * See User A's workout in `/workouts`
  * Fetch User A's workout by ID
  * Read User A's `sets` or `workout_exercises` directly via Supabase client
  * Update or delete User A's records

### What Does Not Get Tested in v1

* UI components (visual bugs are obvious in the browser)
* Auth flows (handled by Supabase, well-tested upstream)
* Routing / redirects (low complexity)
* Database schema migrations (one-off, validated manually)
* Analytics graph rendering (Recharts is well-tested; visual issues are obvious)

### Test File Layout

```
/tests
  /unit
    warmups.test.ts
    analytics.test.ts
  /integration
    workout-creation.test.ts
  RLS-CHECKLIST.md
```

### CI

* Run `vitest run` on every push via GitHub Actions
* Block merges if tests fail
* Skip CI for `RLS-CHECKLIST.md` (manual)

---

## 16. Post-Deploy Smoke Checklist

A short end-to-end sweep to run after deploys. Decision-level requirements live in the sections above; this list only covers the integration paths that automated tests don't.

* Sign up → land on `/workouts` empty state. Log out, log in, password-reset email arrives.
* Create a Day A workout: every set screen reachable, **Back** preserves values, recap row tap jumps + **Done** returns to recap, **Save Workout** redirects to `/workouts` and the new row appears.
* Repeat the create flow for Day B, skipping one set — confirm "Skipped" renders in recap and detail.
* Open the saved workout: detail shows date heading, `Split · Day` sub-line, every set, no warmup section.
* Edit the workout: values preloaded, save issues UPDATEs (no duplicate row in `/workouts`).
* Delete the workout: confirmation dialog appears, confirm deletes, list updates.
* Discard flow: mid-entry, tap logo / bottom tab / browser back → confirmation dialog → Cancel keeps state, Confirm discards.
* Warmups: first time logging Squat/Bench/OHP/Deadlift → no warmup section. After at least one logged session → warmup section appears above the first working set with correct percentages (50/70/90% rounded to 5 kg, floor 20 kg).
* `/analytics`: both tabs render, four lifts each, sticky tab bar stays visible while scrolling, skipped sets excluded.
* RLS: run [tests/RLS-CHECKLIST.md](tests/RLS-CHECKLIST.md) once per policy change.

---

## 17. Future Improvements

* Custom exercises
* Additional splits (3-day, 4-day, etc.)
* PR tracking (top set)
* Editable templates
* Unit toggle (kg / lbs)
* Pagination on workout history
* Time-period filter on analytics (last month / 3 months / all time)
* Logged warmups (instead of guidance-only)
* Configurable empty bar weight (15 kg, 20 kg, etc.)
* Configurable rounding (2.5 kg / 5 kg)
