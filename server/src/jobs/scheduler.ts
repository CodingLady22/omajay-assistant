import cron from "node-cron";
import { getProfile } from "@/db/profile";
import { runDailyTrendsScan } from "@/jobs/daily-trends";
import { runMorningBriefing } from "@/jobs/morning-briefing";
import { logger } from "@/lib/logger";
import type { Profile } from "@/types";

// 6 AM daily trends scan. Kept as a named constant since the morning
// briefing (8 AM default, below) reads today's freshly-scanned trends — the
// two times must stay coordinated if either is changed. Currently a
// hardcoded constant; a future `profile.scan_time` field could formalize
// this the same way `profile.briefing_time` already drives the briefing.
const SCAN_CRON = "0 6 * * *";
const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_BRIEFING_CRON = "0 8 * * *";
const BRIEFING_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// profile.briefing_time is a plain "HH:MM" string (architecture.md), not a
// cron expression — convert it, falling back to the default (and matching
// the SCAN_CRON ordering above) on anything missing or malformed rather than
// letting a bad value crash job registration.
function briefingCronFromTime(time: string | undefined): string {
  if (!time) return DEFAULT_BRIEFING_CRON;
  const match = time.match(BRIEFING_TIME_PATTERN);
  if (!match) {
    logger.warn("jobs/scheduler", `Invalid profile.briefing_time "${time}" — defaulting to ${DEFAULT_BRIEFING_CRON}`);
    return DEFAULT_BRIEFING_CRON;
  }
  const [, hour, minute] = match;
  return `${Number(minute)} ${Number(hour)} * * *`;
}

// Both jobs need the profile (timezone, and now briefing_time) — fetched
// once here rather than twice, with the same try/catch-and-fallback safety
// resolveTimezone() used to have on its own: a transient DB hiccup at boot
// must not crash the whole server over job scheduling.
async function loadSchedulingProfile(): Promise<Profile | null> {
  try {
    return await getProfile();
  } catch (error) {
    logger.error("jobs/scheduler", "Profile lookup failed for job scheduling", error);
    return null;
  }
}

export async function registerJobs(): Promise<void> {
  const profile = await loadSchedulingProfile();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  if (!profile?.timezone) {
    logger.warn("jobs/scheduler", `No profile timezone found — defaulting to ${DEFAULT_TIMEZONE}`);
  }

  cron.schedule(SCAN_CRON, runDailyTrendsScan, { timezone });
  logger.info("jobs/scheduler", `Daily trends scan registered — ${SCAN_CRON} (${timezone})`);

  const briefingCron = briefingCronFromTime(profile?.briefing_time);
  cron.schedule(briefingCron, runMorningBriefing, { timezone });
  logger.info("jobs/scheduler", `Morning briefing registered — ${briefingCron} (${timezone})`);
}
