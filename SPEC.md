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

> **Persistence timing**: `workouts`, `workout_exercises`, and `sets` rows are inserted in a single transaction when the user clicks **Save Workout** on the recap screen. They do **not** exist during the guided entry flow — all in-progress data lives only in client state. For the **edit** flow (existing workout), `sets` rows are `UPDATE`d in place; no new `workouts` or `workout_exercises` rows are created.

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

```sql
-- Splits
INSERT INTO exercise_splits (id, name) VALUES
  ('2day', '2-Day Split');

-- Day A exercises
INSERT INTO exercises (id, name, split_id, day, order_index, notes) VALUES
  (gen_random_uuid(), 'Squat',          '2day', 1, 1, NULL),
  (gen_random_uuid(), 'Bench Press',    '2day', 1, 2, NULL),
  (gen_random_uuid(), 'RDL',            '2day', 1, 3, NULL),
  (gen_random_uuid(), 'Bent Over Rows', '2day', 1, 4, NULL);

-- Day B exercises
INSERT INTO exercises (id, name, split_id, day, order_index, notes) VALUES
  (gen_random_uuid(), 'Deadlift',               '2day', 2, 1, '@ 90% 1RM'),
  (gen_random_uuid(), 'Overhead Press',         '2day', 2, 2, NULL),
  (gen_random_uuid(), 'Pull-ups',               '2day', 2, 3, NULL),
  (gen_random_uuid(), 'Dips',                   '2day', 2, 4, NULL),
  (gen_random_uuid(), 'Bulgarian Split Squats', '2day', 2, 5, NULL);

-- Set templates per exercise (look up exercise_id by name + split + day)
-- Squat
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'top_set', 1, 4, 6, 1, NULL FROM exercises WHERE name = 'Squat'  AND split_id = '2day' AND day = 1
UNION ALL
SELECT id, 'backoff', 2, 6, 10, 2, NULL FROM exercises WHERE name = 'Squat' AND split_id = '2day' AND day = 1;

-- Bench Press
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'top_set', 1, 4, 6, 1, NULL FROM exercises WHERE name = 'Bench Press' AND split_id = '2day' AND day = 1
UNION ALL
SELECT id, 'backoff', 2, 8, 10, 2, NULL FROM exercises WHERE name = 'Bench Press' AND split_id = '2day' AND day = 1;

-- RDL
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal', 1, 6, 10, 3, NULL FROM exercises WHERE name = 'RDL' AND split_id = '2day' AND day = 1;

-- Bent Over Rows
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal', 1, 8, 10, 3, NULL FROM exercises WHERE name = 'Bent Over Rows' AND split_id = '2day' AND day = 1;

-- Deadlift
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal',  1, 1, 1,  3, '@ 90% 1RM' FROM exercises WHERE name = 'Deadlift' AND split_id = '2day' AND day = 2
UNION ALL
SELECT id, 'backoff', 2, 5, 10, 2, NULL        FROM exercises WHERE name = 'Deadlift' AND split_id = '2day' AND day = 2;

-- Overhead Press
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'top_set', 1, 4, 6, 1, NULL FROM exercises WHERE name = 'Overhead Press' AND split_id = '2day' AND day = 2
UNION ALL
SELECT id, 'backoff', 2, 6, 10, 2, NULL FROM exercises WHERE name = 'Overhead Press' AND split_id = '2day' AND day = 2;

-- Pull-ups
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal', 1, 8, 10, 3, NULL FROM exercises WHERE name = 'Pull-ups' AND split_id = '2day' AND day = 2;

-- Dips
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal', 1, 8, 10, 3, NULL FROM exercises WHERE name = 'Dips' AND split_id = '2day' AND day = 2;

-- Bulgarian Split Squats
INSERT INTO exercise_set_templates (exercise_id, type, order_index, target_reps_min, target_reps_max, default_sets, notes)
SELECT id, 'normal', 1, 8, 10, 2, NULL FROM exercises WHERE name = 'Bulgarian Split Squats' AND split_id = '2day' AND day = 2;
```

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

#### Buttons

* **Primary**: green (`accent`) background, near-black text (`accent-text`), 12px vertical padding, 16px horizontal, 8px border-radius
* **Secondary**: transparent with `border` border, primary text
* **Destructive**: transparent, red text — only used for delete actions (always paired with confirm dialog)
* **Full width** on mobile for primary form actions
* **Min height**: 44px

#### Inputs (Weight & Reps)

* `inputMode="decimal"` for weight, `inputMode="numeric"` for reps
* No native number spinners (no up/down arrows)
* Large, centered text — `text-2xl` for legibility while training
* Background: `bg-surface`, border: 1px `border`, focus: 2px `accent` ring
* Tabular numerals
* Placeholder shows the target rep range as a hint (e.g. "4–6")

#### Set Row

```
[Set Label]              [Skip]
[ Weight (kg) ]  [ Reps ]
```

* Label on top: medium weight, includes set type (Top Set / Back-off 1 / etc.)
* Skip toggle on the right of the label — reads **"Skip"** when inactive; flips to **"Undo skip"** with a `RotateCcw` icon and an `accent` border/text when active (so it clearly invites a reversal, rather than reading as a static "Skipped" badge)
* Inputs side by side below
* Skipped state: row at 50% opacity, the input area is replaced with a centered placeholder block containing the word "Skipped" and a hint sub-line ("Tap 'Undo skip' above to enter values.")
* 16px vertical padding between rows; 1px `border` divider only

#### Set Progress (Guided Entry)

Because only one set is on screen at a time, progress is shown at the top of the entry screen rather than per-exercise:

```
Squat — Top Set                    Set 1 / 12
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

* Header line: `[Exercise Name] — [Set Type]` (Title size, left) and `Set X / Y` counter (caption size, `text-secondary`, right, tabular numerals)
* Thin horizontal bar — 4px tall, full-width, 2px border-radius
* Filled portion: `accent` green; empty: `border` (`#27272A`)
* Animates smoothly between states (150ms ease-out)
* `Y` is the total count of working sets across all exercises in the workout
* Warmup sets do **not** count toward `Y` (they're guidance only)
* On the recap screen, the bar is full and reads `Set Y / Y`

#### Set Entry Screen

A single screen showing one working set at a time. Layout, top to bottom:

1. **Set Progress** header (above)
2. **Warmup section** (only for Squat / Bench / OHP / Deadlift, only on the *first working set* of that exercise, only if prior data exists — see Section 10)
3. **Set inputs** — weight (kg) and reps, side by side, with the same input styling defined under "Inputs (Weight & Reps)"
4. **Skip toggle** — top-right of the input row; copy and visuals per "Set Row" above
5. **Validation helper** (conditional) — when the user has touched a field but the set is not yet valid, a single line of `text-muted` text appears below the inputs: "Enter weight and reps, or tap Skip." Suppressed before any interaction (no pre-emptive nagging).
6. **Footer actions** — `Back` (secondary, left) and `Next Set` (primary, right). The footer is **sticky** to the bottom of the viewport, above the bottom tab bar (`bottom: calc(64px + env(safe-area-inset-bottom))`), so the primary action is always thumb-reachable regardless of content height. On the final set, `Next Set` is replaced with `Review`.

Validation gate: while either weight or reps is invalid (and the set is not skipped), `Next Set` / `Review` is visually dimmed (`opacity-50`) and carries `aria-disabled="true"` — but **remains tappable**. Tapping the dimmed button focuses the first empty input rather than failing silently (a silent disabled button confuses users mid-workout). Once both inputs are valid (or the set is skipped), the button reaches its full-color, fully-active state.

`Back` uses the native `disabled` attribute (no alternative action) and is disabled on the first set of the workout.

#### Recap Screen

Shown after the user clears the final set. Layout, top to bottom:

1. Heading: "Review your workout", with a `text-secondary` sub-line: "Tap any set to edit." (signals that the rows below are interactive).
2. For each exercise in `order_index` order:
   * Exercise name (Title size)
   * One row per set, in `order_index` order. Each row is a button — minimum **44px** tall — with the set type label on the left, `[weight × reps]` (or "Skipped") on the right, followed by a small `ChevronRight` (16px, `text-muted`, `aria-hidden`) that signals tap-ability without adding decoration. Tabular numerals on all values. Skipped rows render at 50% opacity.
3. **Footer actions** — `Back` (secondary, returns to the final set with values preserved) and `Save Workout` (primary). The footer is **sticky** to the bottom of the viewport, matching the entry-screen footer pattern.

Tapping a recap row jumps the user back to that specific set in the entry flow with values preserved. While in this "edit-from-recap" mode:

* The primary footer button is relabeled **Done** (in place of `Next Set` / `Review`)
* Tapping **Done** returns directly to the recap — the user is **not** stepped through any subsequent sets
* `Back` still moves to the previous set if the user wants to fix an adjacent entry; the edit-from-recap mode persists, so a later `Done` still returns to the recap

The mode clears as soon as the user lands back on the recap. Re-entering edit on a different row starts a fresh edit-from-recap session.

#### Day Picker (Workout Creation)

* Two large buttons (A / B), full-width, ~80px tall
* Selected state: 2px `accent` border, `accent` text
* Below selected day: list of exercise names, `text-secondary`, no decoration
* A `Start Workout` primary button confirms the selection and enters the guided flow

#### Workout History List Item

* Each item: card with `bg-surface`, 16px padding, 8px border-radius
* **Top row**: workout date (Title size, `text-primary`, tabular numerals) — see "Date Formatting" below for the exact format
* **Bottom row**: `Split name · Day label` in `text-secondary`, caption size

#### Tabs

A horizontal tab bar used to switch between sibling views on the same page (currently: the analytics page).

* Tab row sits at the top of the panel, with a 1px `border` divider running underneath
* Active tab: 2px `accent` bottom border, `text-primary` label
* Inactive tab: transparent bottom border, `text-muted` label (hover → `text-secondary`)
* **Sticky** below the top nav (`top: 56px`) so the tabs remain visible while scrolling through long panels
* Horizontal scroll if tabs overflow the viewport width
* Min height 44px per tab (touch target)
* ARIA: `role="tablist"` on the bar, `role="tab"` + `aria-selected` + `aria-controls` on each button, `role="tabpanel"` + `aria-labelledby` on the panel

#### Confirmation Dialog

Shared pattern for the discard-workout dialog (§9 → Leaving the Guided Flow) and the delete-workout dialog (§9 → Workout Detail).

* Rendered into `document.body` via React portal — escapes sticky footers, tab bars, and any local stacking context that would otherwise clip the dialog
* Backdrop: `fixed inset-0 bg-black/60`, centered on all viewports (`flex items-center justify-center p-4`), `z-[100]` so it sits above the sticky entry/recap footer and the bottom tab bar
* Panel: `bg-surface`, 8px border-radius, 24px padding, max-width 384px (`max-w-sm`), full-width below that
* Body scroll is locked while the dialog is open (`document.body.style.overflow = "hidden"`) and the prior value is restored on close
* Two actions, right-aligned: secondary **Cancel** (transparent with `border`) on the left, primary action on the right — accent style for non-destructive confirmations, destructive style (outlined `text-destructive`) for delete
* `role="dialog"` + `aria-modal="true"`
* In-flight state: while the primary action is pending, both buttons are `disabled` and the primary action's label switches to a verb form ("Deleting…")

#### Analytics Graphs

* Recharts `<LineChart>`, single line per chart in `accent` green
* Gridlines: subtle `border` color, dashed
* Axis labels: `text-secondary`, caption size
* No legend (single line per chart)
* Empty state: centered text, `text-muted`

### Navigation

#### Top Navigation Bar

* Fixed top, full-width, ~56px tall
* Background: `bg-surface` with 1px bottom border
* Left corner: app logo/wordmark ("LOG") linking to `/workouts`
* Logo style: `text-xl font-semibold text-accent`
* Visible on all authenticated routes
* Hidden on auth screens (`/login`, `/signup`, `/reset-password`)

#### Bottom Tab Bar

| Tab        | Icon (Lucide)  | Route          |
|------------|----------------|----------------|
| Workouts   | `Dumbbell`     | `/workouts`    |
| Analytics  | `LineChart`    | `/analytics`   |
| Profile    | `User`         | `/profile`     |

* Fixed bottom, ~64px tall, accounts for `safe-area-inset-bottom`
* Active tab: `accent` icon + label
* Inactive: `text-muted`
* Background: `bg-surface` with 1px top border
* Hidden on auth screens (`/login`, `/signup`, `/reset-password`)

#### New Workout Button

* Positioned at the bottom of the `/workouts` screen, above the bottom tab bar
* Full-width primary button ("New Workout")
* Fixed position so it's always thumb-reachable
* Only visible on the workout list page

#### Leaving the Guided Flow

* During the guided entry flow (`/workouts/new` past day selection, or `/workouts/[id]/edit`), tapping the logo, a bottom tab, or the browser back button shows a **confirmation dialog**: "Discard this workout? Your progress will be lost."
* Confirming discards client state and navigates away. Cancelling keeps the user on the current set.
* The recap screen is treated the same way — leaving without tapping **Save Workout** discards the workout.

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
* All icon-only buttons have `aria-label`
* Semantic HTML (`<main>`, `<nav>`, etc.)
* Form inputs always have associated `<label>` elements
* Validation-gated primary actions use `aria-disabled` (not the native `disabled` attribute) so the button stays focusable and tappable. Tapping a dimmed button must do something useful — typically focus the first empty input — rather than fail silently.

### Don'ts

* No drop shadows, glassmorphism, or gradients
* No emoji as UI elements
* No animations on data load
* No additional accent colors — green is the only accent
* No light mode support in v1

---

## 9. UI Behavior (STRICT)

### Workout Creation (`/workouts/new`)

The flow has three phases on a single route, advancing the user through each via in-page state:

#### Phase 1 — Day Selection

1. User selects Day (A or B)
2. **Inline preview** appears below the day picker showing the list of exercise names for the selected day (order matches `exercises.order_index`; names only, no set/rep schemes)
3. User taps **Start Workout** to enter Phase 2

No database writes occur in Phase 1. The app loads the exercises and set templates for the chosen day into client state, generating an in-memory ordered list of working sets.

#### Phase 2 — Guided Set-by-Set Entry

* Only **one working set** is shown on screen at a time
* Sets are ordered by: exercise `order_index`, then template `order_index`
* For each set, the user must either:
  * Enter a valid weight (> 0 kg) and reps (≥ 1), **or**
  * Toggle **Skip** on
* Once one of the above is true, the **Next Set** button reaches its fully-active state
* Tapping **Next Set** advances to the next working set; on the final set, the button reads **Review** and advances to Phase 3
* While the set is incomplete, the button is visually dimmed but still tappable — tapping it focuses the first empty input rather than advancing (see Section 8 → Set Entry Screen for the full validation-feedback contract)
* Tapping **Back** returns to the previous set with values preserved (disabled on the first set)
* All in-progress data is held in client state only; nothing is persisted yet
* Warmup guidance (Section 10) renders above the set inputs on the *first working set* of any of the big four lifts, when prior data exists

#### Phase 3 — Recap & Save

* The recap screen lists every exercise with each set's logged values (or "Skipped")
* Tapping any recap row jumps back to that set in Phase 2 (values preserved). In this edit-from-recap mode the primary button reads **Done** and returns directly to the recap on tap, regardless of position in the working-set list — the user is never re-walked through subsequent sets
* Tapping **Save Workout** triggers a single transaction that inserts:
  * One `workouts` row (`split_id` hardcoded to `'2day'`, `day` set from selection)
  * One `workout_exercises` row per exercise, in `order_index` order
  * One `sets` row per working set, with `reps`, `weight`, `is_skipped`, and `order_index` populated from client state
* On success, redirects to `/workouts`
* On failure, the user remains on the recap with a non-blocking error message and may retry

---

### Workout History (`/workouts`)

* Lists workouts sorted newest first
* Each entry shows: **Split name · Day label · Date**
* Empty state (no workouts yet): message + **"Start Workout"** button
* The fixed **New Workout** button sits at the bottom of the screen, above the tab bar, on every state of this page

---

### Workout Detail (`/workouts/[id]`)

* **Read-only recap** of a saved workout
* **Header**: workout date (Display size, tabular) on top; `Split name · Day label` (caption, `text-secondary`) below — same hierarchy as the workout list item. The edit screen (`/workouts/[id]/edit`) uses the same header.
* Same layout as the Recap Screen component (Section 8), minus the `Save Workout` / `Back` buttons
* **Sticky footer actions** at the bottom of the viewport (matching the entry/recap footer pattern, `bottom: calc(64px + env(safe-area-inset-bottom))`):
  * **Delete** (left, secondary destructive style — outlined, `text-destructive`, with a `Trash2` icon and "Delete" label) — opens the confirmation dialog
  * **Edit** (right, primary `accent` style with a `Pencil` icon and "Edit" label) — routes to `/workouts/[id]/edit`
* Both buttons fill the footer equally (`flex-1`) and meet the 44px touch-target minimum
* Warmup section is **not** shown on this screen (warmups are guidance for live entry only)

---

### Edit Workout (`/workouts/[id]/edit`)

* Re-runs Phase 2 + Phase 3 of the guided flow with all set values preloaded from the saved workout
* Day selection is skipped (the day is already determined)
* Skip state is preserved and toggleable
* Tapping **Save Workout** issues `UPDATE` statements against existing `sets` rows; no new `workouts` or `workout_exercises` rows are created
* Validation rules (Section 5) apply identically to the create flow
* Cancelling (via the discard dialog) leaves the saved workout untouched

---

### Delete Workout

* Confirmation dialog required before deletion
* On confirm: workout and all related records deleted via cascade

---

### User Actions

Allowed:

* Enter weight (kg) and reps
* Mark set as skipped / unskip
* Move forward and backward through sets during entry
* Jump to a specific set from the recap screen

Not allowed:

* Add sets
* Delete sets
* Modify exercise structure or order
* Log warmups (warmups are guidance only)
* Skip the recap (Save Workout is reachable only via the recap screen)

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

RLS is enabled on all user-data tables. All policies use `auth.uid()`.

### `workouts`

```sql
-- SELECT
CREATE POLICY "Users can view own workouts"
ON workouts FOR SELECT
USING (auth.uid() = user_id);

-- INSERT
CREATE POLICY "Users can insert own workouts"
ON workouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "Users can update own workouts"
ON workouts FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE
CREATE POLICY "Users can delete own workouts"
ON workouts FOR DELETE
USING (auth.uid() = user_id);
```

### `workout_exercises`

```sql
-- Indirect ownership via workouts
CREATE POLICY "Users can manage own workout_exercises"
ON workout_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_exercises.workout_id
    AND w.user_id = auth.uid()
  )
);
```

### `sets`

```sql
-- Indirect ownership via workout_exercises → workouts
CREATE POLICY "Users can manage own sets"
ON sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = sets.workout_exercise_id
    AND w.user_id = auth.uid()
  )
);
```

### `exercises`, `exercise_splits`, `exercise_set_templates`

* Read-only for all authenticated users (seed/template data)

```sql
CREATE POLICY "Authenticated users can read exercises"
ON exercises FOR SELECT
USING (auth.role() = 'authenticated');

-- Repeat for exercise_splits and exercise_set_templates
```

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

## 16. Acceptance Criteria

### Auth & Routing
* User can sign up, log in, and reset password
* Unauthenticated users are redirected to `/login`

### Workout Flow
* User selects a day (A or B) to start a workout
* Selecting a day shows an inline preview of exercise names for that day
* Tapping **Start Workout** enters the guided entry flow; no DB rows are created at this point
* Only one working set is displayed at a time, in `exercise.order_index` then `template.order_index` order
* **Next Set** is disabled until the current set has valid weight + reps OR is marked skipped
* **Back** returns to the previous set with values preserved (disabled on the first set)
* On the final set, the primary button reads **Review** and advances to the recap
* The recap lists every exercise with each set's weight × reps (or "Skipped")
* Tapping any recap row jumps to that set in the entry flow with values preserved; the primary button reads **Done** and returns directly to the recap when tapped
* **Save Workout** on the recap inserts `workouts`, `workout_exercises`, and `sets` rows in one transaction, then redirects to `/workouts`
* Navigating away from any phase of the guided flow (logo, tab bar, browser back) prompts a discard confirmation
* Fixed number of sets per exercise (no add/remove)
* Set types (top set, back-off, normal) are respected
* User can log weight (kg) and reps; weight and reps are required unless the set is skipped
* User can skip/unskip the current set
* Top-of-screen progress shows `Exercise Name — Set Type` and `Set X / Y` across the entire workout

### Warmups
* Warmups are shown only for Squat, Bench, Overhead Press, and Deadlift
* Warmup weights are computed from previous performance and rounded to 5 kg
* Warmup weights below 20 kg are clamped to 20 kg
* Warmup section is hidden for first-time exercises (no prior data)
* Warmups are not editable, not logged, and not stored in the database

### History & Detail
* Workout history shows Split · Day · Date, newest first
* A fixed **New Workout** button sits at the bottom of `/workouts`, above the bottom tab bar
* Empty history shows empty state + Start Workout button
* `/workouts/[id]` shows a read-only recap of the saved workout (no warmup section)
* `/workouts/[id]` exposes **Edit** and **Delete** as full-width labeled buttons in a sticky footer above the bottom tab bar
* Delete requires confirmation; cascades to all related records
* Edit (`/workouts/[id]/edit`) re-runs the guided flow with values preloaded; saving issues `UPDATE`s against existing `sets`

### Analytics
* `/analytics` page renders two tabs: **Top Set Weight** (default) and **Estimated 1RM**
* Each tab shows a line graph per main lift (Squat, Bench, Deadlift, OHP)
* The tab bar is sticky below the top nav so it remains visible while scrolling
* Skipped sets are excluded from all calculations
* Empty state shown when no data exists for a lift

### Data & Security
* Data persists correctly per user
* Workouts are private (RLS enforced)
* App is deployed and usable on Vercel

### Design & Navigation
* App is dark mode only and uses the defined color palette
* Top navigation bar is visible on all authenticated routes; left-corner logo links to `/workouts`
* Bottom tab bar is visible on all authenticated routes
* Leaving the guided entry flow via logo, tab bar, or back button prompts a discard confirmation
* Inter font loads correctly with tabular numerals on all numeric displays
* All touch targets meet the 44×44px minimum
* `/profile` page shows email, sign-out, and password reset link
* Confirmation dialogs (discard, delete) render via a portal to `document.body`, lock body scroll while open, and sit above sticky footers and the bottom tab bar
* Workout list, detail, and edit screens display the workout date as the primary heading and the `Split · Day` as the secondary label
* Relative dates use a calendar-day diff so workouts logged late at night don't read as "Today" the following morning

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
