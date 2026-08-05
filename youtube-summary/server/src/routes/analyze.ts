import { Router } from "express";
import { extractVideoId } from "../util/youtubeUrl";
import { fetchTranscript, fetchVideoMetadata, joinTranscript, TranscriptUnavailableError } from "../services/transcriptService";
import { analyzeTranscript, AnalysisError } from "../services/analysisService";
import { createSession } from "../services/sessionStore";

export const analyzeRouter = Router();

analyzeRouter.post("/", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  const videoId = extractVideoId(url);
  if (!videoId) {
    res.status(400).json({ error: "Lien YouTube invalide." });
    return;
  }

  try {
    const [segments, metadata] = await Promise.all([
      fetchTranscript(videoId),
      fetchVideoMetadata(videoId),
    ]);
    const transcript = joinTranscript(segments);

    const analysis = await analyzeTranscript(metadata.title, transcript);

    const session = createSession({
      videoId,
      title: metadata.title,
      authorName: metadata.authorName,
      thumbnailUrl: metadata.thumbnailUrl,
      transcript,
      analysis,
    });

    res.json({
      sessionId: session.id,
      videoId: session.videoId,
      title: session.title,
      authorName: session.authorName,
      thumbnailUrl: session.thumbnailUrl,
      analysis: session.analysis,
    });
  } catch (error) {
    if (error instanceof TranscriptUnavailableError) {
      res.status(422).json({ error: error.message });
      return;
    }
    if (error instanceof AnalysisError) {
      res.status(503).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Erreur inattendue lors de l'analyse de la vidéo." });
  }
});
