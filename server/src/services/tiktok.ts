import type { TikTokTrend } from "@/types";

const DEFAULT_QUERY = "makeup";

// Out of scope until the client has TikTok Research API access — always
// returns []. The trends-agent must treat this as a normal empty result and
// never fabricate TikTok data. Implement here only, once access arrives.
export async function fetchTrendingVideos(query: string = DEFAULT_QUERY): Promise<TikTokTrend[]> {
  return [];
}
