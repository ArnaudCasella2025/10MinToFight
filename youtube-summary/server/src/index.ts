import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { analyzeRouter } from "./routes/analyze";
import { chatRouter } from "./routes/chat";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/analyze", analyzeRouter);
app.use("/api/chat", chatRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`youtube-summary server listening on port ${port}`);
  console.log(`Anthropic API: ${process.env.ANTHROPIC_API_KEY ? "enabled" : "disabled (analyze/chat will return 503)"}`);
});
