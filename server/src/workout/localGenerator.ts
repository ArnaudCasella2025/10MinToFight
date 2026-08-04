import {
  CATEGORY_QUOTA,
  Category,
  Exercise,
  EXERCISES,
  REST_SECONDS,
  WORK_SECONDS,
  getExercisesByCategory,
} from "../data/exercises";
import { Workout, WorkoutExercise } from "./types";

/** Deterministic string hash (djb2) used to seed the PRNG. */
function hashSeed(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG: fast, deterministic, good enough for shuffling. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Orders candidates so that exercises NOT used recently come first (shuffled among
 * themselves), followed by recently-used ones (also shuffled), so we still have a
 * full list to draw from if a category runs short on fresh options.
 */
function prioritizeFresh(candidates: Exercise[], recentSlugs: Set<string>, random: () => number): Exercise[] {
  const fresh = seededShuffle(
    candidates.filter((exercise) => !recentSlugs.has(exercise.slug)),
    random,
  );
  const stale = seededShuffle(
    candidates.filter((exercise) => recentSlugs.has(exercise.slug)),
    random,
  );
  return [...fresh, ...stale];
}

function pickMartialArts(count: number, recentSlugs: Set<string>, random: () => number): Exercise[] {
  const all = getExercisesByCategory("martial_arts");
  const disciplines = seededShuffle(
    Array.from(new Set(all.map((exercise) => exercise.discipline))).filter(Boolean),
    random,
  );

  const byDiscipline = new Map<string, Exercise[]>();
  for (const discipline of disciplines) {
    const key = discipline as string;
    byDiscipline.set(key, prioritizeFresh(all.filter((exercise) => exercise.discipline === key), recentSlugs, random));
  }

  const picked: Exercise[] = [];
  const pickedSlugs = new Set<string>();
  let round = 0;
  while (picked.length < count && round < 10) {
    for (const discipline of disciplines) {
      if (picked.length >= count) break;
      const pool = byDiscipline.get(discipline as string) ?? [];
      const candidate = pool.find((exercise) => !pickedSlugs.has(exercise.slug));
      if (candidate) {
        picked.push(candidate);
        pickedSlugs.add(candidate.slug);
      }
    }
    round++;
  }
  return picked;
}

function pickCategory(category: Category, count: number, recentSlugs: Set<string>, random: () => number): Exercise[] {
  if (category === "martial_arts") {
    return pickMartialArts(count, recentSlugs, random);
  }
  const ordered = prioritizeFresh(getExercisesByCategory(category), recentSlugs, random);
  return ordered.slice(0, count);
}

export function generateLocalWorkout(date: string, deviceId: string, recentSlugs: string[]): Workout {
  const random = mulberry32(hashSeed(`${deviceId}:${date}`));
  const recentSet = new Set(recentSlugs);

  const categories = Object.keys(CATEGORY_QUOTA) as Category[];
  const selected: Exercise[] = [];
  for (const category of categories) {
    selected.push(...pickCategory(category, CATEGORY_QUOTA[category], recentSet, random));
  }

  const ordered = seededShuffle(selected, random);

  const exercises: WorkoutExercise[] = ordered.map((exercise) => ({
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    discipline: exercise.discipline,
    summary: exercise.summary,
    description: exercise.description,
    workSeconds: WORK_SECONDS,
    restSeconds: REST_SECONDS,
  }));

  return { date, source: "local", exercises };
}

export function allExercisesForPrompt(): Exercise[] {
  return EXERCISES;
}
