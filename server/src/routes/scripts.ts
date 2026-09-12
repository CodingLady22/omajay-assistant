import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { getStoredScripts, reviseScript, setScriptStatus, updateScript } from "@/agents/content-agent";
import { logger } from "@/lib/logger";

const router = Router();

const idParamSchema = z.object({ id: z.string().min(1) });
const statusBodySchema = z.object({ status: z.enum(["draft", "posted"]) });

// Mirrors server/src/types/index.ts's ReelScriptDraft/CaptionScriptDraft —
// carousel excluded, same reasoning (content-agent never generates that kind).
const reelDraftSchema = z.object({
  kind: z.literal("reel"),
  title: z.string().min(1),
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()),
});
const captionDraftSchema = z.object({
  kind: z.literal("caption"),
  title: z.string().min(1),
  variants: z.array(z.string()).min(2),
  hashtags: z.array(z.string()),
});
const draftSchema = z.discriminatedUnion("kind", [reelDraftSchema, captionDraftSchema]);
const reviseBodySchema = z.object({
  currentDraft: draftSchema,
  instruction: z.string().min(1),
});

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

// Bypasses the orchestrator/graph entirely (see content-agent.ts's
// reviseScript) — the client is already in a locked chat-editing session for
// this specific script, so there's no intent to classify and no AgentState
// involvement. :id is validated for a consistent resource URL but unused by
// reviseScript itself, since the full working copy travels in the body.
router.post("/:id/revise", async (req: Request, res: Response) => {
  try {
    idParamSchema.parse(req.params);
    const { currentDraft, instruction } = reviseBodySchema.parse(req.body);
    const revised = await reviseScript(currentDraft, instruction);
    return res.json({ success: true, data: revised });
  } catch (error) {
    logger.error("routes/scripts", "Failed to revise script", error);
    return res
      .status(500)
      .json({ success: false, error: "Couldn't revise that script right now — try again in a moment." });
  }
});

// The only route that commits an edit session — called from the chat panel's
// explicit Save action, never from a typed message.
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const draft = draftSchema.parse(req.body);
    const script = await updateScript(id, draft);
    if (!script) {
      return res.status(404).json({ success: false, error: "Script not found" });
    }
    return res.json({ success: true, data: script });
  } catch (error) {
    logger.error("routes/scripts", "Failed to save script", error);
    return res.status(500).json({ success: false, error: "Failed to save script" });
  }
});

export default router;
