import { randomUUID } from "crypto";
import { AnalysisSession } from "../types";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4h
const sessions = new Map<string, AnalysisSession>();

export function createSession(data: Omit<AnalysisSession, "id" | "createdAt" | "messages">): AnalysisSession {
  const session: AnalysisSession = {
    ...data,
    id: randomUUID(),
    messages: [],
    createdAt: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): AnalysisSession | undefined {
  const session = sessions.get(id);
  if (session && Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 30 * 60 * 1000).unref();
