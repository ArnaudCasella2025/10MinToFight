import { AnalyzeResponse } from "../types/analysis";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {}

async function parseError(response: Response): Promise<never> {
  let message = `Erreur ${response.status}`;
  try {
    const data = await response.json();
    if (typeof data?.error === "string") message = data.error;
  } catch {
    // ignore, keep default message
  }
  throw new ApiError(message);
}

export async function analyzeVideo(url: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) return parseError(response);
  return response.json();
}

export async function sendChatMessage(sessionId: string, message: string): Promise<string> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!response.ok) return parseError(response);
  const data = await response.json();
  return data.reply as string;
}
