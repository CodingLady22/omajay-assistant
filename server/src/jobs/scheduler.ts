import cron from "node-cron";
import { getProfile } from "@/db/profile";
import { runDailyTrendsScan } from "@/jobs/daily-trends";
import { logger } from "@/lib/logger";

// 6 AM daily trends scan. Kept as a named constant since feature 21 (morning
// briefing, 8 AM) reads yesterday's/today's freshly-scanned trends — the two
// times must stay coordinated if either is changed. Currently a hardcoded
// constant; a future `profile.scan_time` field could formalize this the same
// way `profile.briefing_time` already drives the briefing schedule.
const SCAN_CRON = "0 6 * * *";
const DEFAULT_TIMEZONE = "UTC";

async function resolveTimezone(): Promise<string> {
  try {
    const profile = await getProfile();
    if (profile?.timezone) return profile.timezone;
    logger.warn("jobs/scheduler", `No profile timezone found — defaulting to ${DEFAULT_TIMEZONE}`);
    return DEFAULT_TIMEZONE;
  } catch (error) {
    logger.error("jobs/scheduler", `Profile timezone lookup failed — defaulting to ${DEFAULT_TIMEZONE}`, error);
    return DEFAULT_TIMEZONE;
  }
}

export async function registerJobs(): Promise<void> {
  const timezone = await resolveTimezone();

  cron.schedule(SCAN_CRON, runDailyTrendsScan, { timezone });
  logger.info("jobs/scheduler", `Daily trends scan registered — ${SCAN_CRON} (${timezone})`);
}
