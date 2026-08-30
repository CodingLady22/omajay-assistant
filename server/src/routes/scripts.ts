import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { getStoredScripts, setScriptStatus } from "@/agents/content-agent";
import { logger } from "@/lib/logger";

const router = Router();

const idParamSchema = z.object({ id: z.string().min(1) });
const statusBodySchema = z.object({ status: z.enum(["draft", "posted"]) });

router.get("/", async (_req: Request, res: Response) => {
  try {
    const scripts = await getStoredScripts();
    return res.json({ success: true, data: scripts });
  } catch (error) {
    logger.error("routes/scripts", "Failed to fetch stored scripts", error);
    return res.status(500).json({ success: false, error: "Failed to fetch scripts" });
  }
});

router.post("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusBodySchema.parse(req.body);
    const script = await setScriptStatus(id, status);
    if (!script) {
      return res.status(404).json({ success: false, error: "Script not found" });
    }
    return res.json({ success: true, data: script });
  } catch (error) {
    logger.error("routes/scripts", "Failed to update script status", error);
    return res.status(500).json({ success: false, error: "Failed to update script status" });
  }
});

export default router;
