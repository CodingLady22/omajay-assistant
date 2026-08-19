import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { confirmProposedEvent, discardProposedEvent, getCalendarView } from "@/agents/calendar-agent";
import { logger } from "@/lib/logger";

const router = Router();

const eventIdSchema = z.object({ eventId: z.string().min(1) });

router.get("/", async (_req: Request, res: Response) => {
  try {
    const events = await getCalendarView();
    return res.json({ success: true, data: events });
  } catch (error) {
    logger.error("routes/calendar", "Failed to fetch calendar events", error);
    return res.status(500).json({ success: false, error: "Failed to fetch calendar events" });
  }
});

router.post("/confirm", async (req: Request, res: Response) => {
  try {
    const { eventId } = eventIdSchema.parse(req.body);
    const event = await confirmProposedEvent(eventId);
    return res.json({ success: true, data: event });
  } catch (error) {
    logger.error("routes/calendar", "Failed to confirm proposed event", error);
    return res.status(500).json({ success: false, error: "Failed to confirm event" });
  }
});

router.post("/discard", async (req: Request, res: Response) => {
  try {
    const { eventId } = eventIdSchema.parse(req.body);
    await discardProposedEvent(eventId);
    return res.json({ success: true, data: null });
  } catch (error) {
    logger.error("routes/calendar", "Failed to discard proposed event", error);
    return res.status(500).json({ success: false, error: "Failed to discard event" });
  }
});

export default router;
