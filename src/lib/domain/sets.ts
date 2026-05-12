import type {
  ExerciseRow,
  SetTemplateRow,
  WorkingSet,
  WorkoutPlan,
  SetType,
} from "./types";

/** "Top Set" / "Back-off N" / "Set N" — matches the UI's set-type label. */
export function setLabel(type: SetType, indexWithinType: number, countOfType: number): string {
  if (type === "top_set") return "Top Set";
  if (type === "backoff") {
    return countOfType > 1 ? `Back-off ${indexWithinType + 1}` : "Back-off";
  }
  return countOfType > 1 ? `Set ${indexWithinType + 1}` : "Set";
}

/** Expand exercises + templates into the flat list of working sets the user walks through.
 *
 *  Spec §5: each template contributes `default_sets` sets; if a range exists the higher
 *  number wins (already encoded in `default_sets` in the seed). Order: exercise.order_index
 *  asc, then template.order_index asc. */
export function buildWorkoutPlan(
  day: 1 | 2,
  exercises: ExerciseRow[],
  templates: SetTemplateRow[],
): WorkoutPlan {
  const orderedExercises = [...exercises].sort((a, b) => a.order_index - b.order_index);

  const workingSets: WorkingSet[] = [];
  let planIndex = 0;

  for (const ex of orderedExercises) {
    const exerciseTemplates = templates
      .filter((t) => t.exercise_id === ex.id)
      .sort((a, b) => a.order_index - b.order_index);

    let indexInExercise = 0;
    for (const tpl of exerciseTemplates) {
      for (let k = 0; k < tpl.default_sets; k++) {
        workingSets.push({
          key: `${ex.id}:${tpl.id}:${k}`,
          setId: null,
          exerciseId: ex.id,
          exerciseName: ex.name,
          setTemplateId: tpl.id,
          setType: tpl.type,
          label: setLabel(tpl.type, k, tpl.default_sets),
          indexInExercise,
          planIndex,
          isFirstOfExercise: indexInExercise === 0,
          targetRepsMin: tpl.target_reps_min,
          targetRepsMax: tpl.target_reps_max,
        });
        indexInExercise++;
        planIndex++;
      }
    }
  }

  return { day, workingSets, total: workingSets.length };
}
