import type { InstagramTrend } from "@/types";

const DEFAULT_HASHTAG = "makeup";

// Deferred: real Graph API call is blocked on INSTAGRAM_TOKEN / INSTAGRAM_ACCOUNT_ID,
// not available yet (see progress-tracker.md). Stubbed like tiktok.ts so the
// trends-agent (feature 08) can loop over all three services identically today —
// swapping in the real call once the token lands only touches this file.
export async function fetchHashtagTopPosts(hashtag: string = DEFAULT_HASHTAG): Promise<InstagramTrend[]> {
  return [];
}
