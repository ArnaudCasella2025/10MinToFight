import AsyncStorage from "@react-native-async-storage/async-storage";
import { Workout } from "../types/workout";

const KEY_PREFIX = "10mintofight:workout:";

export async function getCachedWorkout(date: string): Promise<Workout | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + date);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Workout;
  } catch {
    return null;
  }
}

export async function cacheWorkout(workout: Workout): Promise<void> {
  await AsyncStorage.setItem(KEY_PREFIX + workout.date, JSON.stringify(workout));
}
