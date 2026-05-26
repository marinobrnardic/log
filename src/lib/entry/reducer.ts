import type {
  ExerciseRow,
  SavedWorkout,
  SetTemplateRow,
  SetValue,
  WorkoutPlan,
} from "@/lib/domain/types";
import { buildWorkoutPlan } from "@/lib/domain/sets";
import { getSuggestedWeight } from "@/lib/domain/progression";

export type Phase = "day" | "entry" | "recap";

export interface EntryState {
  phase: Phase;
  day: 1 | 2 | null;
  plan: WorkoutPlan | null;
  values: Record<string, SetValue>;
  /** Current working-set index within plan.workingSets. */
  index: number;
  /** True when entry state has been touched after creation. Powers the
   *  discard dialog. Stays true after the user hits the recap; goes false
   *  only after a successful save. */
  dirty: boolean;
  /** True when the user entered the current set via "edit" on the recap.
   *  Causes the next `next` action to return to recap instead of advancing. */
  returnToRecap: boolean;
}

export type EntryAction =
  | {
      type: "selectDay";
      day: 1 | 2;
      exercises: ExerciseRow[];
      templates: SetTemplateRow[];
      history: SavedWorkout[];
      weightIncrement: number;
    }
  | { type: "start" }
  | { type: "setField"; field: "weight" | "reps"; value: string }
  | { type: "toggleSkip" }
  | { type: "next" }
  | { type: "back" }
  | { type: "jumpTo"; index: number; fromRecap?: boolean }
  | { type: "goToRecap" }
  | { type: "skipExercise" }
  | { type: "finishWorkout" }
  | { type: "markClean" };

export const emptyValue = (): SetValue => ({ weight: "", reps: "", isSkipped: false });

/** True if the user has typed weight or reps for this set (and hasn't skipped it). */
export function hasEnteredValue(v: SetValue | undefined): boolean {
  if (!v || v.isSkipped) return false;
  return v.weight !== "" || v.reps !== "";
}

export function createInitialState(overrides: Partial<EntryState> = {}): EntryState {
  return {
    phase: "day",
    day: null,
    plan: null,
    values: {},
    index: 0,
    dirty: false,
    returnToRecap: false,
    ...overrides,
  };
}

function currentKey(state: EntryState): string | null {
  const plan = state.plan;
  if (!plan) return null;
  return plan.workingSets[state.index]?.key ?? null;
}

function ensureValue(state: EntryState, key: string): SetValue {
  return state.values[key] ?? emptyValue();
}

export function entryReducer(state: EntryState, action: EntryAction): EntryState {
  switch (action.type) {
    case "selectDay": {
      const plan = buildWorkoutPlan(action.day, action.exercises, action.templates);
      // Preserve values if user re-selects the same day (don't clobber typed-in
      // input); otherwise seed each working set with a suggested weight from
      // history. Reps stay empty — the user always logs what they actually did.
      const reselectingSameDay = state.day === action.day;
      const values: Record<string, SetValue> = reselectingSameDay
        ? state.values
        : seedSuggestedValues(plan, action.history, action.weightIncrement);
      return { ...state, day: action.day, plan, values, returnToRecap: false };
    }
    case "start": {
      if (!state.plan) return state;
      return { ...state, phase: "entry", index: 0 };
    }
    case "setField": {
      const key = currentKey(state);
      if (!key) return state;
      const v = ensureValue(state, key);
      return {
        ...state,
        dirty: true,
        values: { ...state.values, [key]: { ...v, [action.field]: action.value } },
      };
    }
    case "toggleSkip": {
      const key = currentKey(state);
      if (!key) return state;
      const v = ensureValue(state, key);
      return {
        ...state,
        dirty: true,
        values: { ...state.values, [key]: { ...v, isSkipped: !v.isSkipped } },
      };
    }
    case "next": {
      if (!state.plan) return state;
      if (state.returnToRecap) {
        return { ...state, phase: "recap", returnToRecap: false };
      }
      const last = state.index >= state.plan.workingSets.length - 1;
      if (last) return { ...state, phase: "recap" };
      return { ...state, index: state.index + 1 };
    }
    case "back": {
      if (state.index === 0) return state;
      return { ...state, phase: "entry", index: state.index - 1 };
    }
    case "jumpTo": {
      if (!state.plan) return state;
      const clamped = Math.max(0, Math.min(action.index, state.plan.workingSets.length - 1));
      return {
        ...state,
        phase: "entry",
        index: clamped,
        returnToRecap: action.fromRecap === true,
      };
    }
    case "goToRecap": {
      if (!state.plan) return state;
      return { ...state, phase: "recap", returnToRecap: false };
    }
    case "skipExercise": {
      if (!state.plan) return state;
      const current = state.plan.workingSets[state.index];
      if (!current) return state;
      const newValues = { ...state.values };
      for (const ws of state.plan.workingSets) {
        if (ws.exerciseId === current.exerciseId) {
          newValues[ws.key] = { ...emptyValue(), isSkipped: true };
        }
      }
      if (state.returnToRecap) {
        return {
          ...state,
          values: newValues,
          phase: "recap",
          returnToRecap: false,
          dirty: true,
        };
      }
      const nextIndex = state.plan.workingSets.findIndex(
        (ws) => ws.planIndex > state.index && ws.exerciseId !== current.exerciseId,
      );
      if (nextIndex === -1) {
        return { ...state, values: newValues, phase: "recap", dirty: true };
      }
      return { ...state, values: newValues, index: nextIndex, dirty: true };
    }
    case "finishWorkout": {
      if (!state.plan) return state;
      const startIndex = canAdvance(state) ? state.index + 1 : state.index;
      const newValues = { ...state.values };
      for (let i = startIndex; i < state.plan.workingSets.length; i++) {
        const key = state.plan.workingSets[i].key;
        newValues[key] = { ...emptyValue(), isSkipped: true };
      }
      return {
        ...state,
        values: newValues,
        phase: "recap",
        returnToRecap: false,
        dirty: true,
      };
    }
    case "markClean": {
      return { ...state, dirty: false };
    }
  }
}

/** Seed initial set values with weight suggestions from history. Reps are
 *  intentionally left blank — they're what the user is logging today. Sets
 *  with no matching history get the empty default. Never marks state dirty:
 *  this runs from `selectDay`, which is a no-input action. */
function seedSuggestedValues(
  plan: WorkoutPlan,
  history: SavedWorkout[],
  increment: number,
): Record<string, SetValue> {
  const out: Record<string, SetValue> = {};
  for (const ws of plan.workingSets) {
    const suggested = getSuggestedWeight({
      exerciseName: ws.exerciseName,
      setType: ws.setType,
      indexInExercise: ws.indexInExercise,
      targetRepsMax: ws.targetRepsMax,
      history,
      increment,
    });
    out[ws.key] =
      suggested != null
        ? { weight: String(suggested), reps: "", isSkipped: false }
        : emptyValue();
  }
  return out;
}

/** Validation gate: can the user advance from the current set? */
export function canAdvance(state: EntryState): boolean {
  const key = currentKey(state);
  if (!key) return false;
  const v = ensureValue(state, key);
  if (v.isSkipped) return true;
  const w = Number(v.weight);
  const r = Number(v.reps);
  return Number.isFinite(w) && w > 0 && Number.isFinite(r) && Number.isInteger(r) && r >= 1;
}
