import { Category, Discipline } from "../data/exercises";

export interface WorkoutExercise {
  slug: string;
  name: string;
  category: Category;
  discipline?: Discipline;
  summary: string;
  description: string;
  workSeconds: number;
  restSeconds: number;
}

export interface Workout {
  date: string; // YYYY-MM-DD
  source: "llm" | "local";
  exercises: WorkoutExercise[];
}
