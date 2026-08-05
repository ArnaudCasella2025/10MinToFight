import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, MODEL } from "./anthropicClient";
import { AnalysisSession } from "../types";
import { AnalysisError } from "./analysisService";

const MAX_TRANSCRIPT_CHARS = 120_000;

function buildSystemPrompt(session: AnalysisSession): string {
  const transcript =
    session.transcript.length > MAX_TRANSCRIPT_CHARS
      ? session.transcript.slice(0, MAX_TRANSCRIPT_CHARS) + " [...transcript tronqué...]"
      : session.transcript;

  return [
    "Tu es un assistant qui discute avec l'utilisateur du contenu d'une vidéo YouTube précise.",
    "Réponds UNIQUEMENT à partir du transcript fourni ci-dessous et du résumé déjà généré.",
    "Si l'information demandée n'est pas dans le transcript, dis-le clairement au lieu d'inventer.",
    "Reste concis, réponds en français, et rappelle au besoin que la fiabilité des propos de la vidéo n'a pas été ",
    "vérifiée de façon indépendante (analyse heuristique uniquement).",
    "",
    `Titre de la vidéo : ${session.title}`,
    `Résumé déjà généré : ${session.analysis.summary.join(" ")}`,
    "",
    "Transcript complet :",
    transcript,
  ].join("\n");
}

export async function replyInChat(session: AnalysisSession, userMessage: string): Promise<string> {
  const client = getAnthropicClient();
  if (!client) {
    throw new AnalysisError("ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
  }

  const messages: Anthropic.MessageParam[] = [
    ...session.messages.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(session),
    messages,
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const reply = textBlock?.text?.trim();
  if (!reply) {
    throw new AnalysisError("Réponse inattendue du modèle (pas de texte).");
  }
  return reply;
}
