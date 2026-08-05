import { Router } from "express";
import { getSession } from "../services/sessionStore";
import { replyInChat } from "../services/chatService";
import { AnalysisError } from "../services/analysisService";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "Message vide." });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session introuvable ou expirée. Ré-analysez la vidéo." });
    return;
  }

  try {
    const reply = await replyInChat(session, message);
    session.messages.push({ role: "user", content: message });
    session.messages.push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (error) {
    if (error instanceof AnalysisError) {
      res.status(503).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Erreur inattendue lors de la réponse du chat." });
  }
});
