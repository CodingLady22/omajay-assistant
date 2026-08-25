import { buildFallbackBriefing, composeBriefing, type BriefingContext } from "@/agents/briefing-agent";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { runMorningBriefing } from "@/jobs/morning-briefing";
import { logger } from "@/lib/logger";

// The all-empty context is checked explicitly, not left to whatever the real
// database happens to contain — it's the most likely real-world state right
// now (no events today, and any drafts already in Mongo may be outside the
// 14-day recency window) and the case most at risk of reading as an awkward
// empty shell instead of a natural "nothing outstanding" message.
const EMPTY_CONTEXT: BriefingContext = {
  today: "Tuesday, August 25, 2026",
  events: [],
  draftScripts: [],
  draftContracts: [],
  pendingDms: [],
};

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
}

main()
  .catch((error) => {
    logger.error("jobs/run-briefing-test", "Morning briefing test run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
