export interface ReliabilityAssessment {
  level: "faible" | "moyenne" | "élevée";
  score: number; // 1-5
  rationale: string[];
  caveat: string;
}

export interface VideoAnalysis {
  summary: string[];
  keyClaims: { claim: string; note: string }[];
  reliability: ReliabilityAssessment;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnalysisSession {
  id: string;
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  transcript: string;
  analysis: VideoAnalysis;
  messages: ChatMessage[];
  createdAt: number;
}
