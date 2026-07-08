import fs from "fs";
import path from "path";

const HISTORY_DIR = path.join(__dirname, "..", "..", "data", "history");
const MAX_ENTRIES = 14;

interface HistoryEntry {
  date: string; // YYYY-MM-DD
  slugs: string[];
  source: "llm" | "local";
}

function historyFilePath(deviceId: string): string {
  const safeId = deviceId.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  return path.join(HISTORY_DIR, `${safeId}.json`);
}

function ensureDir(): void {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

export function readHistory(deviceId: string): HistoryEntry[] {
  ensureDir();
  const filePath = historyFilePath(deviceId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HistoryEntry[];
    return [];
  } catch {
    return [];
  }
}

export function recordWorkout(
  deviceId: string,
  date: string,
  slugs: string[],
  source: "llm" | "local",
): void {
  ensureDir();
  const filePath = historyFilePath(deviceId);
  const history = readHistory(deviceId).filter((entry) => entry.date !== date);
  history.push({ date, slugs, source });
  history.sort((a, b) => (a.date < b.date ? -1 : 1));
  const trimmed = history.slice(-MAX_ENTRIES);
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), "utf-8");
}

export function getWorkoutForDate(deviceId: string, date: string): HistoryEntry | undefined {
  return readHistory(deviceId).find((entry) => entry.date === date);
}

/** Slugs used recently (excluding the given date), most recent first, deduplicated. */
export function getRecentSlugs(deviceId: string, beforeDate: string, days = 6): string[] {
  const history = readHistory(deviceId)
    .filter((entry) => entry.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, days);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of history) {
    for (const slug of entry.slugs) {
      if (!seen.has(slug)) {
        seen.add(slug);
        result.push(slug);
      }
    }
  }
  return result;
}
