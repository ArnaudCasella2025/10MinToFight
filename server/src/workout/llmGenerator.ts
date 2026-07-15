import Anthropic from "@anthropic-ai/sdk";
import {
  CATEGORY_QUOTA,
  Category,
  EXERCISES,
  REST_SECONDS,
  WORK_SECONDS,
  getExerciseBySlug,
} from "../data/exercises";
import { Workout, WorkoutExercise } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function buildLibraryDescription(): string {
  return EXERCISES.map((exercise) => {
    const discipline = exercise.discipline ? ` / ${exercise.discipline}` : "";
    return `- ${exercise.slug} [${exercise.category}${discipline}] ${exercise.name}: ${exercise.summary}`;
  }).join("\n");
}

function quotaMatches(slugs: string[]): boolean {
  const counts: Record<Category, number> = {
    cardio: 0,
    strength_upper: 0,
    stretch: 0,
    martial_arts: 0,
  };
  for (const slug of slugs) {
    const exercise = getExerciseBySlug(slug);
    if (!exercise) return false;
    counts[exercise.category]++;
  }
  return (Object.keys(CATEGORY_QUOTA) as Category[]).every(
    (category) => counts[category] === CATEGORY_QUOTA[category],
  );
}

/**
 * Asks Claude to pick today's 10 exercises from the fixed library, respecting the
 * category quotas and favoring variety against recently used exercises. Returns
 * null on any failure (missing key, network error, invalid/unparseable output) so
 * the caller can fall back to the local generator — the workout must never fail
 * to generate just because the LLM call didn't work out.
 */
export async function generateLlmWorkout(
  date: string,
  recentSlugs: string[],
): Promise<Workout | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  const quotaDescription = (Object.keys(CATEGORY_QUOTA) as Category[])
    .map((category) => `${category}: ${CATEGORY_QUOTA[category]}`)
    .join(", ");

  const system =
    "Tu es un coach sportif qui compose l'entraînement quotidien de 10 minutes d'un utilisateur, " +
    "uniquement à partir de la bibliothèque d'exercices fournie (aucun équipement). " +
    "Tu dois choisir exactement 10 exercices en respectant STRICTEMENT le quota par catégorie, " +
    "et en favorisant la variété : évite autant que possible les exercices utilisés récemment, " +
    "et pour les arts martiaux essaie de varier les disciplines par rapport aux jours précédents.";

  const userPrompt = [
    `Date de l'entraînement : ${date}`,
    `Quota requis par catégorie (total 10) : ${quotaDescription}`,
    recentSlugs.length > 0
      ? `Exercices utilisés récemment (à éviter si possible) : ${recentSlugs.join(", ")}`
      : "Aucun historique récent pour cet utilisateur.",
    "",
    "Bibliothèque d'exercices disponibles (slug [catégorie/discipline] nom : résumé) :",
    buildLibraryDescription(),
  ].join("\n");

  const tool: Anthropic.Tool = {
    name: "select_workout",
    description: "Sélectionne les 10 exercices du jour à partir des slugs de la bibliothèque fournie.",
    input_schema: {
      type: "object",
      properties: {
        slugs: {
          type: "array",
          items: { type: "string" },
          minItems: 10,
          maxItems: 10,
          description: "Exactement 10 slugs, dans l'ordre où l'entraînement doit se dérouler.",
        },
      },
      required: ["slugs"],
    },
  };

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userPrompt }],
      tools: [tool],
      tool_choice: { type: "tool", name: "select_workout" },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return null;

    const input = toolUse.input as { slugs?: unknown };
    if (!Array.isArray(input.slugs) || input.slugs.length !== 10) return null;
    const slugs = input.slugs.filter((slug): slug is string => typeof slug === "string");
    if (slugs.length !== 10) return null;
    if (new Set(slugs).size !== 10) return null;
    if (!quotaMatches(slugs)) return null;

    const exercises: WorkoutExercise[] = [];
    for (const slug of slugs) {
      const exercise = getExerciseBySlug(slug);
      if (!exercise) return null;
      exercises.push({
        slug: exercise.slug,
        name: exercise.name,
        category: exercise.category,
        discipline: exercise.discipline,
        summary: exercise.summary,
        description: exercise.description,
        workSeconds: WORK_SECONDS,
        restSeconds: REST_SECONDS,
        imageUrl: null,
      });
    }

    return { date, source: "llm", exercises };
  } catch {
    return null;
  }
}
