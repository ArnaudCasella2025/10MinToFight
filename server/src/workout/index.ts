import { REST_SECONDS, WORK_SECONDS, getExerciseBySlug } from "../data/exercises";
import { getRecentSlugs, getWorkoutForDate, recordWorkout } from "../util/historyStore";
import { generateLlmWorkout } from "./llmGenerator";
import { generateLocalWorkout } from "./localGenerator";
import { Workout, WorkoutExercise } from "./types";

function toWorkoutExercise(slug: string): WorkoutExercise | undefined {
  const exercise = getExerciseBySlug(slug);
  if (!exercise) return undefined;
  return {
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    discipline: exercise.discipline,
    summary: exercise.summary,
    description: exercise.description,
    workSeconds: WORK_SECONDS,
    restSeconds: REST_SECONDS,
  };
}

/**
 * Returns today's workout for a device, generating it once per day and reusing
 * the same result on subsequent calls (so re-opening the app the same day, or a
 * flaky network retry, doesn't reshuffle the exercises).
 */
export async function getOrCreateWorkout(deviceId: string, date: string): Promise<Workout> {
  const existing = getWorkoutForDate(deviceId, date);
  if (existing) {
    const exercises = existing.slugs
      .map(toWorkoutExercise)
      .filter((exercise): exercise is WorkoutExercise => Boolean(exercise));
    return { date, source: existing.source, exercises };
  }

  const recentSlugs = getRecentSlugs(deviceId, date);

  const llmWorkout = await generateLlmWorkout(date, recentSlugs);
  const workout = llmWorkout ?? generateLocalWorkout(date, deviceId, recentSlugs);

  recordWorkout(
    deviceId,
    date,
    workout.exercises.map((exercise) => exercise.slug),
    workout.source,
  );

  return workout;
}
