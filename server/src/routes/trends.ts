import { Router } from "express";
import type { Request, Response } from "express";
import { getStoredTrends } from "@/agents/trends-agent";
import { logger } from "@/lib/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const trends = await getStoredTrends();
    return res.json({ success: true, data: trends });
  } catch (error) {
    logger.error("routes/trends", "Failed to fetch stored trends", error);
    return res.status(500).json({ success: false, error: "Failed to fetch trends" });
  }
});

export default router;
