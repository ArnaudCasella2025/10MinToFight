import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptSegment {
  text: string;
  offset: number;
}

export interface VideoMetadata {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export class TranscriptUnavailableError extends Error {}

/**
 * Fetches the auto-generated or manual captions for a video. Throws
 * TranscriptUnavailableError when the video has no captions (disabled,
 * private, or age-restricted) so the caller can surface a clear message
 * instead of a generic 500.
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "fr" }).catch(() =>
      YoutubeTranscript.fetchTranscript(videoId),
    );
    if (!raw || raw.length === 0) {
      throw new TranscriptUnavailableError("Transcript vide");
    }
    return raw.map((segment) => ({ text: segment.text, offset: segment.offset }));
  } catch (error) {
    if (error instanceof TranscriptUnavailableError) throw error;
    throw new TranscriptUnavailableError(
      "Aucun sous-titre disponible pour cette vidéo (désactivés, vidéo privée, ou restreinte).",
    );
  }
}

export function joinTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => segment.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Video title/author/thumbnail via YouTube's public oEmbed endpoint —
 * no API key required.
 */
export async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    return {
      title: "Vidéo YouTube",
      authorName: "",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  const data = (await response.json()) as { title?: string; author_name?: string };
  return {
    title: data.title || "Vidéo YouTube",
    authorName: data.author_name || "",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}
