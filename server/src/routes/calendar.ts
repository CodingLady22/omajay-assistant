import { Router } from "express";
import type { Request, Response } from "express";
import { getUpcomingEvents } from "@/agents/calendar-agent";
import { logger } from "@/lib/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const events = await getUpcomingEvents();
    return res.json({ success: true, data: events });
  } catch (error) {
    logger.error("routes/calendar", "Failed to fetch calendar events", error);
    return res.status(500).json({ success: false, error: "Failed to fetch calendar events" });
  }
});

export default router;
