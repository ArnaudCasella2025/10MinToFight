import { Router } from "express";
import { getOrCreateWorkout } from "../workout";

export const workoutRouter = Router();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

workoutRouter.get("/today", async (req, res) => {
  const deviceId = typeof req.query.deviceId === "string" ? req.query.deviceId : "";
  if (!deviceId) {
    res.status(400).json({ error: "Missing required query param: deviceId" });
    return;
  }
  const date = typeof req.query.date === "string" && req.query.date.length > 0 ? req.query.date : todayIso();

  try {
    const workout = await getOrCreateWorkout(deviceId, date);
    res.json(workout);
  } catch (error) {
    console.error("Failed to generate workout", error);
    res.status(500).json({ error: "Failed to generate workout" });
  }
});
