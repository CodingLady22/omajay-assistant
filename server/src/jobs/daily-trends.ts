import { DEFAULT_TOPIC, scanAndStoreTrends } from "@/agents/trends-agent";
import { getProfile } from "@/db/profile";
import { logger } from "@/lib/logger";

export async function runDailyTrendsScan(): Promise<void> {
  try {
    const profile = await getProfile();
    const topic = profile?.niche ?? DEFAULT_TOPIC;
    const stored = await scanAndStoreTrends(topic, profile);
    logger.info("jobs/daily-trends", `Scan complete — stored ${stored.length} trends for topic "${topic}"`);
  } catch (error) {
    logger.error("jobs/daily-trends", "Daily trends scan failed", error);
  }
}
