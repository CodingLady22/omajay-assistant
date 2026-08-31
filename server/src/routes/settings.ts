import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { getProfile, updateProfileSettings, withReminderDefaults } from "@/db/profile";
import { rescheduleBriefing } from "@/jobs/scheduler";
import { isGoogleCalendarConfigured, isInstagramConfigured, isWhatsAppConfigured, isYouTubeConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ConnectionStatus, Profile, SettingsPayload } from "@/types";

const router = Router();

// Same "HH:MM" shape architecture.md documents for profile.briefing_time —
// rejected here with a clean 400-via-catch rather than silently falling back
// to a default cron expression the way jobs/scheduler.ts's own parser does,
// since this is user input from a form, not a boot-time profile read.
const BRIEFING_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const remindersSchema = z.object({
  events: z.boolean(),
  scripts: z.boolean(),
  contracts: z.boolean(),
  dms: z.boolean(),
});

const updateSettingsSchema = z.object({
  briefingTime: z.string().regex(BRIEFING_TIME_PATTERN, "Expected HH:MM"),
  reminders: remindersSchema,
});

// Presence-of-env-vars only, not a live API call — see lib/env.ts's
// isConfigured(). A credential that's present but actually broken still
// surfaces the normal way, through that integration's own error path.
function getConnections(): ConnectionStatus {
  return {
    whatsapp: isWhatsAppConfigured(),
    instagram: isInstagramConfigured(),
    youtube: isYouTubeConfigured(),
    googleCalendar: isGoogleCalendarConfigured(),
  };
}

function toSettingsPayload(profile: Profile): SettingsPayload {
  return {
    briefingTime: profile.briefing_time,
    timezone: profile.timezone,
    reminders: withReminderDefaults(profile.reminders),
    connections: getConnections(),
  };
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const profile = await getProfile();
    if (!profile) {
      return res.status(404).json({ success: false, error: "No profile configured" });
    }
    return res.json({ success: true, data: toSettingsPayload(profile) });
  } catch (error) {
    logger.error("routes/settings", "Failed to fetch settings", error);
    return res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { briefingTime, reminders } = updateSettingsSchema.parse(req.body);
    const updated = await updateProfileSettings(briefingTime, reminders);
    if (!updated) {
      return res.status(404).json({ success: false, error: "No profile configured" });
    }
    // Swaps the live cron task immediately — without this, a changed
    // briefing_time would only take effect on the next server restart.
    rescheduleBriefing(updated.briefing_time, updated.timezone);
    return res.json({ success: true, data: toSettingsPayload(updated) });
  } catch (error) {
    logger.error("routes/settings", "Failed to update settings", error);
    return res.status(500).json({ success: false, error: "Failed to update settings" });
  }
});

export default router;
