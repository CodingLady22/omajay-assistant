import express from "express";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.listen(env.PORT, () => {
  logger.info("index", `Server listening on port ${env.PORT}`);
});
