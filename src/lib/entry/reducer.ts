import type {
  ExerciseRow,
  SetTemplateRow,
  SetValue,
  WorkoutPlan,
} from "@/lib/domain/types";
import { buildWorkoutPlan } from "@/lib/domain/sets";

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
  | { type: "selectDay"; day: 1 | 2; exercises: ExerciseRow[]; templates: SetTemplateRow[] }
  | { type: "start" }
  | { type: "setField"; field: "weight" | "reps"; value: string }
  | { type: "toggleSkip" }
  | { type: "next" }
  | { type: "back" }
  | { type: "jumpTo"; index: number; fromRecap?: boolean }
  | { type: "goToRecap" }
  | { type: "markClean" };

export const emptyValue = (): SetValue => ({ weight: "", reps: "", isSkipped: false });

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
      // Preserve values if user re-selects the same day; otherwise reset.
      const keep = state.day === action.day ? state.values : {};
      return { ...state, day: action.day, plan, values: keep, returnToRecap: false };
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
    case "markClean": {
      return { ...state, dirty: false };
    }
  }
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
