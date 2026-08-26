import { buildBriefing } from "@/agents/briefing-agent";
import { collections } from "@/db/collections";
import { getProfile } from "@/db/profile";
import { logger } from "@/lib/logger";

// The pluggable delivery seam build-plan.md's feature 22 note calls for.
// WhatsApp (feature 05) is still deferred, so this logs + persists to
// `briefings` instead of calling sendWhatsApp. Once feature 05 lands, swap
// this function's body for a real send — nothing else in this job, or in
// briefing-agent.ts, needs to change. `her_reply` stays unset here; it's
// filled in later by the WhatsApp webhook, once it exists.
async function deliverBriefing(text: string): Promise<void> {
  logger.info("jobs/morning-briefing", `Briefing: ${text}`);
  await collections.briefings().insertOne({ sent_at: new Date(), content: text });
}

export async function runMorningBriefing(): Promise<void> {
  try {
    const profile = await getProfile();
    const text = await buildBriefing(profile);
    await deliverBriefing(text);
    logger.info("jobs/morning-briefing", "Morning briefing delivered");
  } catch (error) {
    logger.error("jobs/morning-briefing", "Morning briefing failed", error);
  }
}
