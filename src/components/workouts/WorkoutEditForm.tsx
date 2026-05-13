"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditableSetRow } from "./EditableSetRow";
import { DiscardDialog } from "@/components/entry/DiscardDialog";
import { useRegisterFlowGuard } from "@/components/nav/FlowGuardContext";
import { updateWorkoutAction } from "@/actions/workouts";
import { setLabel } from "@/lib/domain/sets";
import { formatWeight, dayLabel, formatWorkoutDate } from "@/lib/format";
import type { SavedWorkout, SetValue } from "@/lib/domain/types";
import type { UpdatePayloadSet } from "@/lib/db/queries";

const SPLIT_NAME = "2-Day Split";

interface Props {
  workout: SavedWorkout;
}

interface RowMeta {
  setId: string;
  label: string;
}

export function WorkoutEditForm({ workout }: Props) {
  const router = useRouter();
  const { setHandler } = useRegisterFlowGuard();
  const pendingIntent = useRef<(() => void) | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Build initial values keyed by saved set id, plus per-exercise label info.
  const { initialValues, exerciseSections } = useMemo(() => {
    const initialValues: Record<string, SetValue> = {};
    const exerciseSections: { name: string; rows: RowMeta[] }[] = [];

    for (const ex of workout.exercises) {
      const typeCounts = new Map<string, number>();
      for (const s of ex.sets) typeCounts.set(s.setType, (typeCounts.get(s.setType) ?? 0) + 1);
      const typeIndex = new Map<string, number>();

      const rows: RowMeta[] = [];
      for (const s of ex.sets) {
        const idx = typeIndex.get(s.setType) ?? 0;
        typeIndex.set(s.setType, idx + 1);
        const label = setLabel(s.setType, idx, typeCounts.get(s.setType) ?? 1);
        rows.push({ setId: s.id, label });
        initialValues[s.id] = {
          weight: s.isSkipped || s.weight == null ? "" : formatWeight(s.weight),
          reps: s.isSkipped || s.reps == null ? "" : String(s.reps),
          isSkipped: s.isSkipped,
        };
      }
      exerciseSections.push({ name: ex.exerciseName, rows });
    }

    return { initialValues, exerciseSections };
  }, [workout]);

  const [values, setValues] = useState<Record<string, SetValue>>(initialValues);

  const isDirty = useMemo(() => {
    for (const id in initialValues) {
      const a = initialValues[id];
      const b = values[id];
      if (!b) return true;
      if (a.weight !== b.weight || a.reps !== b.reps || a.isSkipped !== b.isSkipped) return true;
    }
    return false;
  }, [initialValues, values]);

  const invalidCount = useMemo(() => {
    let n = 0;
    for (const id in values) {
      if (!isRowValid(values[id])) n++;
    }
    return n;
  }, [values]);

  // Wire up the discard guard so top nav / bottom tabs intercept while dirty.
  useEffect(() => {
    const handler = (intent: () => void) => {
      if (!isDirty) return true;
      pendingIntent.current = intent;
      setDiscardOpen(true);
      return false;
    };
    setHandler(handler);
    return () => setHandler(null);
  }, [isDirty, setHandler]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const updateField = useCallback((setId: string, field: "weight" | "reps", value: string) => {
    setValues((prev) => ({ ...prev, [setId]: { ...prev[setId], [field]: value } }));
  }, []);

  const toggleSkip = useCallback((setId: string) => {
    setValues((prev) => ({
      ...prev,
      [setId]: { ...prev[setId], isSkipped: !prev[setId].isSkipped },
    }));
  }, []);

  function navigateAway() {
    pendingIntent.current = null;
    router.push(`/workouts/${workout.id}`);
  }

  function onCancel() {
    if (!isDirty) {
      navigateAway();
      return;
    }
    pendingIntent.current = navigateAway;
    setDiscardOpen(true);
  }

  function onSave() {
    setErrorMsg(null);
    if (invalidCount > 0) {
      setShowInvalid(true);
      return;
    }

    startTransition(async () => {
      const payload: UpdatePayloadSet[] = Object.keys(values).map((id) => {
        const v = values[id];
        return {
          id,
          reps: v.isSkipped ? null : v.reps === "" ? null : Number(v.reps),
          weight: v.isSkipped ? null : v.weight === "" ? null : Number(v.weight),
          is_skipped: v.isSkipped,
        };
      });

      const res = await updateWorkoutAction(workout.id, payload);
      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }
      router.replace(`/workouts/${workout.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-6 pb-28">
        <header>
          <h1 className="text-3xl font-semibold tabular">
            {formatWorkoutDate(workout.createdAt)}
          </h1>
          <p className="text-sm text-(--color-text-secondary) mt-1">
            {SPLIT_NAME} · Day {dayLabel(workout.day)}
          </p>
        </header>

        {exerciseSections.map((section) => (
          <section key={section.name} className="space-y-1">
            <h2 className="text-2xl font-semibold">{section.name}</h2>
            <div className="divide-y divide-(--color-border)">
              {section.rows.map((row) => (
                <EditableSetRow
                  key={row.setId}
                  label={row.label}
                  value={values[row.setId]}
                  invalid={showInvalid && !isRowValid(values[row.setId])}
                  onChange={(field, v) => updateField(row.setId, field, v)}
                  onToggleSkip={() => toggleSkip(row.setId)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky footer above the bottom tab bar. */}
      <div className="fixed inset-x-0 bottom-16 safe-bottom px-4 z-20 pointer-events-none">
        <div className="max-w-[640px] mx-auto pb-3 pointer-events-auto space-y-2">
          {errorMsg && (
            <p className="text-sm text-(--color-destructive) bg-(--color-bg-surface) rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
          {showInvalid && invalidCount > 0 && (
            <p className="text-sm text-(--color-destructive) bg-(--color-bg-surface) rounded-lg px-3 py-2">
              {invalidCount} set{invalidCount === 1 ? "" : "s"} need values (or mark them skipped).
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex-1 min-h-[44px] rounded-lg border border-(--color-border) bg-(--color-bg-surface)"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !isDirty}
              className="flex-1 min-h-[44px] rounded-lg bg-(--color-accent) text-(--color-accent-text) font-medium hover:bg-(--color-accent-hover) disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
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
          // Reset to initial so the guard doesn't re-fire mid-navigation.
          setValues(initialValues);
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

function isRowValid(v: SetValue | undefined): boolean {
  if (!v) return false;
  if (v.isSkipped) return true;
  const w = Number(v.weight);
  const r = Number(v.reps);
  return Number.isFinite(w) && w > 0 && Number.isFinite(r) && Number.isInteger(r) && r >= 1;
}
