import { buildFallbackBriefing, composeBriefing, type BriefingContext } from "@/agents/briefing-agent";
import { getEventDateKey, isEventAllDay } from "@/agents/calendar-agent";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { DEFAULT_REMINDERS } from "@/db/profile";
import { briefingCronFromTime, DEFAULT_BRIEFING_CRON } from "@/jobs/scheduler";
import { runMorningBriefing } from "@/jobs/morning-briefing";
import { logger } from "@/lib/logger";
import type { CalendarEventView } from "@/types";

// The all-empty context is checked explicitly, not left to whatever the real
// database happens to contain — it's the most likely real-world state right
// now (no events today, and any drafts already in Mongo may be outside the
// 14-day recency window) and the case most at risk of reading as an awkward
// empty shell instead of a natural "nothing outstanding" message.
const EMPTY_CONTEXT: BriefingContext = {
  today: "Tuesday, August 25, 2026",
  timezone: "Europe/Rome",
  reminders: DEFAULT_REMINDERS,
  events: [],
  draftScripts: [],
  draftContracts: [],
  pendingDms: [],
};

// Same shape as EMPTY_CONTEXT, but every reminder toggled off — proves a
// disabled category is genuinely absent from the composed briefing (feature
// 24), not merely reported as empty. Both contexts have identical (empty)
// underlying data; only `reminders` differs, so any difference in output is
// attributable to the toggles, not the data.
const ALL_REMINDERS_OFF_CONTEXT: BriefingContext = {
  ...EMPTY_CONTEXT,
  reminders: { events: false, scripts: false, contracts: false, dms: false },
};

// A real all-day event as services/google-calendar.ts's normalizeEvent
// produces one — timezone-naive "T00:00:00"/"T23:59:00" strings. Used below
// to prove getEventDateKey resolves the same calendar date regardless of the
// server process's own local timezone (process.env.TZ), which is exactly
// what the feature-22 timezone fix (and its feature-13 twin) requires: the
// date must come from profile.timezone (or, for all-day events, directly
// from the string), never from wherever the host happens to be running.
const ALL_DAY_EVENT: CalendarEventView = {
  id: "test-all-day",
  title: "Test All-Day Shoot",
  start: "2026-08-25T00:00:00",
  end: "2026-08-25T23:59:00",
  location: "",
  color: "pink",
  status: "confirmed",
};

function assertEqual(label: string, actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed — ${label}: expected "${expected}", got "${actual}"`);
  }
  logger.info("jobs/run-briefing-test", `OK — ${label}: "${actual}"`);
}

async function main(): Promise<void> {
  await connectToDatabase();

  logger.info("jobs/run-briefing-test", "--- Real run (whatever gathers from the live database) ---");
  await runMorningBriefing();

  logger.info("jobs/run-briefing-test", "--- All-empty context (LLM composition) ---");
  const emptyLlmBriefing = await composeBriefing(EMPTY_CONTEXT);
  logger.info("jobs/run-briefing-test", `Empty-context LLM briefing: ${emptyLlmBriefing}`);

  logger.info("jobs/run-briefing-test", "--- All-empty context (deterministic fallback) ---");
  const emptyFallbackBriefing = buildFallbackBriefing(EMPTY_CONTEXT);
  logger.info("jobs/run-briefing-test", `Empty-context fallback briefing: ${emptyFallbackBriefing}`);
  assertEqual(
    "buildFallbackBriefing — all reminders on, genuinely nothing to report",
    emptyFallbackBriefing,
    "Good morning! Nothing on your calendar today. Nothing outstanding right now. What's your plan for today?"
  );

  logger.info("jobs/run-briefing-test", "--- All reminders off (proves a disabled category is absent, not just empty) ---");
  const allOffFallbackBriefing = buildFallbackBriefing(ALL_REMINDERS_OFF_CONTEXT);
  logger.info("jobs/run-briefing-test", `All-reminders-off fallback briefing: ${allOffFallbackBriefing}`);
  assertEqual(
    "buildFallbackBriefing — all reminders off",
    allOffFallbackBriefing,
    "Good morning! What's your plan for today?"
  );

  logger.info(
    "jobs/run-briefing-test",
    `--- All-day event date key across the timezone boundary (process TZ=${process.env.TZ ?? "(host default)"}) ---`
  );
  assertEqual("isEventAllDay(all-day fixture)", String(isEventAllDay(ALL_DAY_EVENT)), "true");
  assertEqual("getEventDateKey(all-day fixture, Europe/Rome)", getEventDateKey(ALL_DAY_EVENT, "Europe/Rome"), "2026-08-25");
  assertEqual(
    "getEventDateKey(all-day fixture, Pacific/Kiritimati)",
    getEventDateKey(ALL_DAY_EVENT, "Pacific/Kiritimati"),
    "2026-08-25"
  );

  logger.info("jobs/run-briefing-test", "--- Cron derivation from profile.briefing_time ---");
  assertEqual("briefingCronFromTime('08:00')", briefingCronFromTime("08:00"), "0 8 * * *");
  assertEqual("briefingCronFromTime(undefined)", briefingCronFromTime(undefined), DEFAULT_BRIEFING_CRON);
  assertEqual("briefingCronFromTime('not-a-time')", briefingCronFromTime("not-a-time"), DEFAULT_BRIEFING_CRON);
}

main()
  .catch((error) => {
    logger.error("jobs/run-briefing-test", "Morning briefing test run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
