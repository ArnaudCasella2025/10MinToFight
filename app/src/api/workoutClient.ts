import { API_BASE_URL } from "../config/env";
import { buildEmergencyWorkout } from "../data/emergencyWorkout";
import { cacheWorkout, getCachedWorkout } from "../storage/workoutCache";
import { getOrCreateDeviceId } from "../storage/deviceId";
import { Workout } from "../types/workout";

const REQUEST_TIMEOUT_MS = 8000;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolves today's workout with a three-level fallback so the user always sees
 * a workout even without connectivity:
 *   1. Ask the backend (LLM-generated or its own local algorithm).
 *   2. Fall back to whatever was cached for today (e.g. earlier this session).
 *   3. Fall back to a fixed emergency routine bundled with the app.
 */
export async function fetchTodayWorkout(date: string = todayIso()): Promise<Workout> {
  const deviceId = await getOrCreateDeviceId();

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/workout/today?deviceId=${encodeURIComponent(deviceId)}&date=${encodeURIComponent(date)}`,
      REQUEST_TIMEOUT_MS,
    );
    if (!response.ok) throw new Error(`Server responded with ${response.status}`);
    const workout = (await response.json()) as Workout;
    await cacheWorkout(workout);
    return workout;
  } catch (error) {
    console.warn("Falling back to cached/emergency workout:", error);
    const cached = await getCachedWorkout(date);
    if (cached) return cached;
    return buildEmergencyWorkout(date);
  }
}

export function exerciseImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${API_BASE_URL}${imageUrl}`;
}
