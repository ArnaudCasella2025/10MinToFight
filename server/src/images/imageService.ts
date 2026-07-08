import fs from "fs";
import path from "path";
import { Exercise } from "../data/exercises";

const IMAGES_DIR = path.join(__dirname, "..", "..", "data", "images");
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export interface CachedImage {
  buffer: Buffer;
  contentType: string;
}

function ensureDir(): void {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function imagePath(slug: string): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(IMAGES_DIR, `${safeSlug}.png`);
}

function readCached(slug: string): CachedImage | null {
  const filePath = imagePath(slug);
  if (!fs.existsSync(filePath)) return null;
  return { buffer: fs.readFileSync(filePath), contentType: "image/png" };
}

function buildPrompt(exercise: Exercise): string {
  return (
    `Simple flat-style instructional fitness illustration, minimalist vector art, single human ` +
    `figure silhouette demonstrating correct form for the bodyweight exercise "${exercise.name}" ` +
    `(${exercise.summary}). Clean plain light background, side or three-quarter view, clear body ` +
    `posture, no text, no logos, no watermark, no other objects.`
  );
}

async function generateWithOpenAi(exercise: Exercise): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: buildPrompt(exercise),
        size: "512x512",
        n: 1,
      }),
    });

    if (!response.ok) return null;
    const json = (await response.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

/**
 * Returns the cached illustration for this exercise if one was already generated
 * (reused across every future workout that includes this exercise). Otherwise,
 * generates it once via an image-generation API (if configured) and caches it to
 * disk. Returns null when no image is available yet — the client falls back to a
 * bundled category icon in that case.
 */
export async function getOrGenerateExerciseImage(exercise: Exercise): Promise<CachedImage | null> {
  const cached = readCached(exercise.slug);
  if (cached) return cached;

  const generated = await generateWithOpenAi(exercise);
  if (!generated) return null;

  ensureDir();
  fs.writeFileSync(imagePath(exercise.slug), generated);
  return { buffer: generated, contentType: "image/png" };
}
