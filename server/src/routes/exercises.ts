import { Router } from "express";
import { getExerciseBySlug } from "../data/exercises";
import { getOrGenerateExerciseImage } from "../images/imageService";

export const exercisesRouter = Router();

exercisesRouter.get("/:slug/image", async (req, res) => {
  const exercise = getExerciseBySlug(req.params.slug);
  if (!exercise) {
    res.status(404).json({ error: "Unknown exercise" });
    return;
  }

  try {
    const image = await getOrGenerateExerciseImage(exercise);
    if (!image) {
      res.status(404).json({ error: "No image available for this exercise yet" });
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.contentType(image.contentType);
    res.send(image.buffer);
  } catch (error) {
    console.error("Failed to get/generate exercise image", error);
    res.status(500).json({ error: "Failed to get exercise image" });
  }
});
