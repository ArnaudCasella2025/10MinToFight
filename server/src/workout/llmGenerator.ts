import {
  CATEGORY_QUOTA,
  Category,
  EXERCISES,
  REST_SECONDS,
  WORK_SECONDS,
  getExerciseBySlug,
} from "../data/exercises";
import { Workout, WorkoutExercise } from "./types";

// Any OpenAI-compatible "chat completions" endpoint works here (Mammouth AI by
// default, but also OpenAI itself or another compatible proxy) — just point
// LLM_BASE_URL/LLM_API_KEY/LLM_MODEL at it.
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.mammouth.ai/v1";
const LLM_MODEL = process.env.LLM_MODEL || "claude-sonnet-5";

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

/** Pulls the first {...} JSON object out of a model response, tolerating stray prose or markdown fences around it. */
function extractJsonObject(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to brace extraction below
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Asks the configured LLM to pick today's 10 exercises from the fixed library,
 * respecting the category quotas and favoring variety against recently used
 * exercises. Returns null on any failure (missing key, network error,
 * invalid/unparseable output) so the caller can fall back to the local
 * generator — the workout must never fail to generate just because the LLM
 * call didn't work out.
 */
export async function generateLlmWorkout(
  date: string,
  recentSlugs: string[],
): Promise<Workout | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const quotaDescription = (Object.keys(CATEGORY_QUOTA) as Category[])
    .map((category) => `${category}: ${CATEGORY_QUOTA[category]}`)
    .join(", ");

  const system =
    "Tu es un coach sportif qui compose l'entraînement quotidien de 10 minutes d'un utilisateur, " +
    "uniquement à partir de la bibliothèque d'exercices fournie (aucun équipement). " +
    "Tu dois choisir exactement 10 exercices en respectant STRICTEMENT le quota par catégorie, " +
    "et en favorisant la variété : évite autant que possible les exercices utilisés récemment, " +
    "et pour les arts martiaux essaie de varier les disciplines par rapport aux jours précédents. " +
    'Réponds UNIQUEMENT avec un objet JSON de la forme {"slugs": ["slug1", "slug2", ..., "slug10"]}, ' +
    "sans texte autour, sans balises markdown, sans explication.";

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

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = extractJsonObject(content) as { slugs?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.slugs) || parsed.slugs.length !== 10) return null;
    const slugs = parsed.slugs.filter((slug): slug is string => typeof slug === "string");
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
