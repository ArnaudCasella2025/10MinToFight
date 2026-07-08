import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const startSound = require("../../assets/sounds/start.wav");
const stopSound = require("../../assets/sounds/stop.wav");
const completeSound = require("../../assets/sounds/complete.wav");

let initialized = false;

async function ensureAudioMode(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await setAudioModeAsync({ playsInSilentMode: true });
}

function playFromStart(source: number): void {
  const player = createAudioPlayer(source);
  player.play();
  // Free the native player shortly after playback finishes instead of keeping
  // one instance per cue alive forever.
  setTimeout(() => player.remove(), 3000);
}

/** Rings when an exercise (the 45s work phase) starts. */
export async function playExerciseStartCue(): Promise<void> {
  await ensureAudioMode();
  playFromStart(startSound);
}

/** Rings when an exercise stops and the 15s rest phase begins. */
export async function playExerciseStopCue(): Promise<void> {
  await ensureAudioMode();
  playFromStart(stopSound);
}

/** Rings once when the full 10-exercise workout is complete. */
export async function playWorkoutCompleteCue(): Promise<void> {
  await ensureAudioMode();
  playFromStart(completeSound);
}
