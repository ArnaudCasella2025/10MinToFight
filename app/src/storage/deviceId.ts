import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "10mintofight:deviceId";

function randomId(): string {
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}

/**
 * A stable, locally-generated identifier for this install. Used by the backend
 * to remember which exercises this device has done recently, so it can favor
 * variety in the next generated workout. Not tied to any personal information.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const created = randomId();
  await AsyncStorage.setItem(STORAGE_KEY, created);
  return created;
}
