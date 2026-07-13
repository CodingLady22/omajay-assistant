import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { app } from "@/agents/graph";
import { logger } from "@/lib/logger";

const router = Router();

const chatSchema = z.object({
  text: z.string().min(1),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = chatSchema.parse(req.body);
    const runId = randomUUID();
    const result = await app.invoke({ input: body.text, channel: "web", runId });
    return res.json({ success: true, data: { response: result.response } });
  } catch (error) {
    logger.error("routes/chat", "Failed to process chat message", error);
    return res.status(500).json({ success: false, error: "Failed to process message" });
  }
});

export default router;
