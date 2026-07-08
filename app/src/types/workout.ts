export type Category = "cardio" | "strength_upper" | "stretch" | "martial_arts";

export type Discipline = "boxing" | "muay_thai" | "kung_fu" | "krav_maga" | "bjj";

export interface WorkoutExercise {
  slug: string;
  name: string;
  category: Category;
  discipline?: Discipline;
  summary: string;
  description: string;
  workSeconds: number;
  restSeconds: number;
  imageUrl: string | null;
}

export interface Workout {
  date: string; // YYYY-MM-DD
  source: "llm" | "local";
  exercises: WorkoutExercise[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  cardio: "Cardio",
  strength_upper: "Musculation",
  stretch: "Étirements",
  martial_arts: "Arts martiaux",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  cardio: "#E63946",
  strength_upper: "#1D3557",
  stretch: "#2A9D8F",
  martial_arts: "#F4A261",
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  boxing: "Boxe",
  muay_thai: "Muay Thaï",
  kung_fu: "Kung Fu",
  krav_maga: "Krav Maga",
  bjj: "Jujitsu Brésilien",
};
