export interface ReliabilityAssessment {
  level: "faible" | "moyenne" | "élevée";
  score: number;
  rationale: string[];
  caveat: string;
}

export interface VideoAnalysis {
  summary: string[];
  keyClaims: { claim: string; note: string }[];
  reliability: ReliabilityAssessment;
}

export interface AnalyzeResponse {
  sessionId: string;
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  analysis: VideoAnalysis;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
