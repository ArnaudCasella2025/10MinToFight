import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { exercisesRouter } from "./routes/exercises";
import { workoutRouter } from "./routes/workout";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/workout", workoutRouter);
app.use("/api/exercises", exercisesRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`10MinToFight server listening on port ${port}`);
  console.log(`LLM generation: ${process.env.LLM_API_KEY ? "enabled" : "disabled (using local generator)"}`);
  console.log(`Image generation: ${process.env.OPENAI_API_KEY ? "enabled" : "disabled (client falls back to icons)"}`);
});
