import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, MODEL } from "./anthropicClient";
import { VideoAnalysis } from "../types";

const MAX_TRANSCRIPT_CHARS = 120_000;

export class AnalysisError extends Error {}

const ANALYZE_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description:
    "Soumet le résumé et l'évaluation de fiabilité de la vidéo à partir de son transcript.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 8,
        description: "Résumé de la vidéo en points clés, en français, chacun 1-2 phrases.",
      },
      keyClaims: {
        type: "array",
        maxItems: 6,
        description:
          "Les affirmations les plus notables faites dans la vidéo, avec une courte note sur leur nature (vérifiable, opinion, chiffre non sourcé, etc.).",
        items: {
          type: "object",
          properties: {
            claim: { type: "string", description: "L'affirmation, reformulée brièvement." },
            note: { type: "string", description: "Note courte sur sa nature/vérifiabilité." },
          },
          required: ["claim", "note"],
        },
      },
      reliability: {
        type: "object",
        description:
          "Évaluation heuristique de la fiabilité du DISCOURS (sourcing, ton, nuance, vérifiabilité) — pas une vérification factuelle externe.",
        properties: {
          level: { type: "string", enum: ["faible", "moyenne", "élevée"] },
          score: { type: "integer", minimum: 1, maximum: 5 },
          rationale: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 5,
            description: "Raisons concrètes justifiant le niveau (sourcing, ton, nuance, etc.).",
          },
          caveat: {
            type: "string",
            description:
              "Rappel explicite que cette note est une lecture heuristique par IA du discours, pas une vérification factuelle indépendante.",
          },
        },
        required: ["level", "score", "rationale", "caveat"],
      },
    },
    required: ["summary", "keyClaims", "reliability"],
  },
};

const SYSTEM_PROMPT = [
  "Tu es un assistant qui analyse le transcript de vidéos YouTube.",
  "Tu produis : (1) un résumé fidèle et neutre du contenu, (2) les affirmations les plus notables et leur nature, ",
  "(3) une évaluation heuristique de la fiabilité du DISCOURS tenu dans la vidéo.",
  "Cette évaluation de fiabilité repose UNIQUEMENT sur des indices textuels du transcript : présence ou absence de sources ",
  "citées, usage de chiffres précis vs vagues, ton mesuré vs sensationnaliste, nuance vs affirmations absolues, ",
  "distinction entre faits et opinions. Tu n'as PAS accès à internet et tu ne peux PAS vérifier les faits de façon ",
  "indépendante : dis-le explicitement dans le champ 'caveat'. Réponds toujours en français, de façon neutre et factuelle.",
].join(" ");

function truncateTranscript(transcript: string): { text: string; truncated: boolean } {
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) return { text: transcript, truncated: false };
  return { text: transcript.slice(0, MAX_TRANSCRIPT_CHARS), truncated: true };
}

export async function analyzeTranscript(title: string, transcript: string): Promise<VideoAnalysis> {
  const client = getAnthropicClient();
  if (!client) {
    throw new AnalysisError("ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
  }

  const { text, truncated } = truncateTranscript(transcript);

  const userPrompt = [
    `Titre de la vidéo : ${title}`,
    truncated
      ? "Note : le transcript ci-dessous a été tronqué car la vidéo est très longue."
      : null,
    "",
    "Transcript :",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    tools: [ANALYZE_TOOL],
    tool_choice: { type: "tool", name: "submit_analysis" },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new AnalysisError("Réponse inattendue du modèle (pas d'analyse structurée).");
  }

  return toolUse.input as VideoAnalysis;
}
