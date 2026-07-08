import Constants from "expo-constants";

/**
 * Base URL of the 10MinToFight backend. Defaults to localhost for local
 * development. Override by setting `expo.extra.apiBaseUrl` in app.json (or
 * EXPO_PUBLIC_API_BASE_URL as an env var) once the server is deployed.
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  "http://localhost:3000";
