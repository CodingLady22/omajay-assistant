import { fetchHashtagTopPosts } from "@/services/instagram";
import { fetchTrendingVideos as fetchTrendingTikToks } from "@/services/tiktok";
import { fetchTrendingVideos } from "@/services/youtube";
import { logger } from "@/lib/logger";

const TOPIC = "bridal makeup";

async function main(): Promise<void> {
  const youtube = await fetchTrendingVideos(TOPIC);
  logger.info("services/run-trends-test", `YouTube returned ${youtube.length} trend(s) for "${TOPIC}"`, youtube);

  const instagram = await fetchHashtagTopPosts("bridalmakeup");
  logger.info("services/run-trends-test", `Instagram returned ${instagram.length} trend(s) (stub, expect 0)`, instagram);

  const tiktok = await fetchTrendingTikToks(TOPIC);
  logger.info("services/run-trends-test", `TikTok returned ${tiktok.length} trend(s) (stub, expect 0)`, tiktok);
}

main().catch((error) => {
  logger.error("services/run-trends-test", "Trends service test run failed", error);
  process.exitCode = 1;
});
