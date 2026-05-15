"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useRegisterFlowGuard } from "@/components/nav/FlowGuardContext";
import { DiscardDialog } from "@/components/entry/DiscardDialog";
import { DayPicker } from "@/components/entry/DayPicker";
import { SetProgress } from "@/components/entry/SetProgress";
import { SetInputs } from "@/components/entry/SetInputs";
import { WarmupSection } from "@/components/entry/WarmupSection";
import type {
  ExerciseRow,
  SavedWorkout,
  SetTemplateRow,
  SetValue,
} from "@/lib/domain/types";
import {
  canAdvance,
  createInitialState,
  emptyValue,
  entryReducer,
  type EntryState,
} from "@/lib/entry/reducer";
import {
  getAnchorWeight,
  getWarmupSets,
  qualifiesForWarmup,
} from "@/lib/domain/warmup";
import { setLabel as deriveSetLabel } from "@/lib/domain/sets";
import { formatWeight } from "@/lib/format";
import { saveWorkoutAction } from "@/actions/workouts";
import type { SavePayloadExercise } from "@/lib/db/queries";

export interface GuidedFlowDataset {
  dayA: { exercises: ExerciseRow[]; templates: SetTemplateRow[] };
  dayB: { exercises: ExerciseRow[]; templates: SetTemplateRow[] };
  history: SavedWorkout[];
}

interface Props {
  data: GuidedFlowDataset;
}

export function GuidedFlow({ data }: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(entryReducer, createInitialState());

  return (
    <FlowContent
      state={state}
      dispatch={dispatch}
      dataset={data}
      router={router}
    />
  );
}

function FlowContent({
  state,
  dispatch,
  dataset,
  router,
}: {
  state: EntryState;
  dispatch: React.Dispatch<Parameters<typeof entryReducer>[1]>;
  dataset: GuidedFlowDataset;
  router: ReturnType<typeof useRouter>;
}) {
  const { setHandler } = useRegisterFlowGuard();
  const [discardOpen, setDiscardOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pendingIntent = useRef<(() => void) | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);

  const guardActive = state.dirty && state.phase !== "day";

  useEffect(() => {
    const handler = (intent: () => void) => {
      if (!guardActive) return true;
      pendingIntent.current = intent;
      setDiscardOpen(true);
      return false;
    };
    setHandler(handler);
    return () => setHandler(null);
  }, [guardActive, setHandler]);

  useEffect(() => {
    if (!guardActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [guardActive]);

  const onSelectDay = useCallback(
    (day: 1 | 2) => {
      const { exercises, templates } = day === 1 ? dataset.dayA : dataset.dayB;
      dispatch({ type: "selectDay", day, exercises, templates });
    },
    [dataset, dispatch],
  );

  const onStart = useCallback(() => dispatch({ type: "start" }), [dispatch]);

  if (state.phase === "day") {
    return (
      <DayPicker
        selectedDay={state.day}
        dayAExercises={dataset.dayA.exercises}
        dayBExercises={dataset.dayB.exercises}
        onSelect={onSelectDay}
        onStart={onStart}
      />
    );
  }

  if (!state.plan) return null;

  const currentSet = state.plan.workingSets[state.index];
  const value: SetValue = state.values[currentSet?.key ?? ""] ?? emptyValue();

  if (state.phase === "entry") {
    const isLast = state.index === state.plan.workingSets.length - 1;
    const anchor = qualifiesForWarmup(currentSet.exerciseName)
      ? getAnchorWeight(currentSet.exerciseName, dataset.history)
      : null;
    const warmups = currentSet.isFirstOfExercise ? getWarmupSets(anchor) : null;
    const advanceOk = canAdvance(state);
    const hasTouched = !value.isSkipped && (value.weight !== "" || value.reps !== "");
    const handleNext = () => {
      if (advanceOk) {
        dispatch({ type: "next" });
        return;
      }
      if (!value.weight) weightRef.current?.focus();
      else if (!value.reps) repsRef.current?.focus();
    };

    return (
      <>
        <div className="space-y-6 pb-6">
          <SetProgress
            exerciseName={currentSet.exerciseName}
            setLabel={currentSet.label}
            current={state.index + 1}
            total={state.plan.total}
          />
          {warmups && <WarmupSection warmups={warmups} />}
          <SetInputs
            value={value}
            targetRepsMin={currentSet.targetRepsMin}
            targetRepsMax={currentSet.targetRepsMax}
            onChange={(field, v) => dispatch({ type: "setField", field, value: v })}
            onToggleSkip={() => dispatch({ type: "toggleSkip" })}
            showHelper={hasTouched && !advanceOk}
            weightRef={weightRef}
            repsRef={repsRef}
          />
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 px-4 pt-3 pb-3 bg-(--color-bg-base) border-t border-(--color-border) flex flex-col gap-2">
            {!state.returnToRecap && !isLast && (
              <button
                type="button"
                onClick={() => dispatch({ type: "finishWorkout" })}
                className="w-full min-h-[44px] rounded-lg border border-(--color-border) text-(--color-text-secondary)"
              >
                Finish Workout
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "back" })}
                disabled={state.index === 0}
                className="flex-1 min-h-[44px] rounded-lg border border-(--color-border) text-(--color-text-primary) disabled:opacity-30"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-disabled={!advanceOk || undefined}
                className={`flex-1 min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium ${
                  advanceOk ? "hover:bg-(--color-accent-hover)" : "opacity-50"
                }`}
              >
                {state.returnToRecap ? "Done" : isLast ? "Review" : "Next Set"}
              </button>
            </div>
          </div>
        </div>
        <DiscardDialog
          open={discardOpen}
          onConfirm={() => {
            setDiscardOpen(false);
            const intent = pendingIntent.current;
            pendingIntent.current = null;
            dispatch({ type: "markClean" });
            if (intent) intent();
          }}
          onCancel={() => {
            setDiscardOpen(false);
            pendingIntent.current = null;
          }}
        />
      </>
    );
  }

  // Recap phase.
  function onSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const grouped = groupForSave(state);
      const res = await saveWorkoutAction(state.plan!.day, grouped);
      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }
      dispatch({ type: "markClean" });
      router.replace("/workouts");
      router.refresh();
    });
  }

  const continueIndex = firstIncompleteIndex(state);

  return (
    <>
      <div className="space-y-6 pb-6">
        <SetProgress
          exerciseName="Review"
          setLabel="all sets"
          current={state.plan.total}
          total={state.plan.total}
        />
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Review your workout</h2>
          <p className="text-sm text-(--color-text-secondary)">Tap any set to edit.</p>
        </div>
        <RecapList
          state={state}
          onJumpToSet={(i) => dispatch({ type: "jumpTo", index: i, fromRecap: true })}
        />
        {errorMsg && <p className="text-sm text-(--color-destructive)">{errorMsg}</p>}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 px-4 pt-3 pb-3 bg-(--color-bg-base) border-t border-(--color-border) flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "jumpTo", index: continueIndex })}
            disabled={pending}
            className="flex-1 min-h-[44px] rounded-lg border border-(--color-border) disabled:opacity-50"
          >
            Continue Workout
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="flex-1 min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Workout"}
          </button>
        </div>
      </div>
      <DiscardDialog
        open={discardOpen}
        onConfirm={() => {
          setDiscardOpen(false);
          const intent = pendingIntent.current;
          pendingIntent.current = null;
          dispatch({ type: "markClean" });
          if (intent) intent();
        }}
        onCancel={() => {
          setDiscardOpen(false);
          pendingIntent.current = null;
        }}
      />
    </>
  );
}

function RecapList({
  state,
  onJumpToSet,
}: {
  state: EntryState;
  onJumpToSet: (planIndex: number) => void;
}) {
  const grouped = useMemo(() => {
    if (!state.plan) return [];
    type Row = { name: string; rows: { key: string; label: string; planIndex: number }[] };
    const out: Row[] = [];
    for (const ws of state.plan.workingSets) {
      let g = out.find((x) => x.name === ws.exerciseName);
      if (!g) {
        g = { name: ws.exerciseName, rows: [] };
        out.push(g);
      }
      g.rows.push({ key: ws.key, label: ws.label, planIndex: ws.planIndex });
    }
    return out;
  }, [state.plan]);

  return (
    <div className="space-y-6">
      {grouped.map((g) => (
        <section key={g.name} className="space-y-2">
          <h3 className="text-2xl font-semibold">{g.name}</h3>
          <ul className="space-y-1">
            {g.rows.map((row) => {
              const v = state.values[row.key] ?? emptyValue();
              const display = v.isSkipped
                ? "Skipped"
                : v.weight && v.reps
                  ? `${formatWeight(Number(v.weight))} kg × ${v.reps}`
                  : "—";
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => onJumpToSet(row.planIndex)}
                    aria-label={`Edit ${row.label}: ${display}`}
                    className={`w-full text-left rounded px-2 -mx-2 hover:bg-(--color-bg-surface-2) ${
                      v.isSkipped ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 min-h-[44px] py-3 border-b border-(--color-border)">
                      <span className="text-(--color-text-secondary)">{row.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular">{display}</span>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.75}
                          className="text-(--color-text-muted)"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function firstIncompleteIndex(state: EntryState): number {
  if (!state.plan) return 0;
  const sets = state.plan.workingSets;
  for (let i = 0; i < sets.length; i++) {
    const v = state.values[sets[i].key];
    if (!v || v.isSkipped) return i;
    const w = Number(v.weight);
    const r = Number(v.reps);
    const valid =
      Number.isFinite(w) && w > 0 && Number.isFinite(r) && Number.isInteger(r) && r >= 1;
    if (!valid) return i;
  }
  return sets.length - 1;
}

function groupForSave(state: EntryState): SavePayloadExercise[] {
  if (!state.plan) return [];
  const map = new Map<string, SavePayloadExercise>();
  let exerciseOrder = 0;

  for (const ws of state.plan.workingSets) {
    let acc = map.get(ws.exerciseId);
    if (!acc) {
      acc = {
        exercise_id: ws.exerciseId,
        order_index: exerciseOrder++,
        sets: [],
      };
      map.set(ws.exerciseId, acc);
    }
    const v = state.values[ws.key] ?? emptyValue();
    acc.sets.push({
      set_template_id: ws.setTemplateId,
      order_index: acc.sets.length,
      reps: v.isSkipped ? null : v.reps === "" ? null : Number(v.reps),
      weight: v.isSkipped ? null : v.weight === "" ? null : Number(v.weight),
      is_skipped: v.isSkipped,
    });
  }

  return [...map.values()];
}

// Re-export for convenience in case a consumer wants to compute labels.
export const deriveLabel = deriveSetLabel;
