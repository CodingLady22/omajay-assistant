import { Router } from "express";
import type { Request, Response } from "express";
import { getStoredScripts } from "@/agents/content-agent";
import { logger } from "@/lib/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const scripts = await getStoredScripts();
    return res.json({ success: true, data: scripts });
  } catch (error) {
    logger.error("routes/scripts", "Failed to fetch stored scripts", error);
    return res.status(500).json({ success: false, error: "Failed to fetch scripts" });
  }
});

export default router;
