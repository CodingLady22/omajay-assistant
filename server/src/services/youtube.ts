import { z } from "zod";
import { getYouTubeEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { YouTubeTrend } from "@/types";

const DEFAULT_QUERY = "makeup tutorial";
const SEARCH_WINDOW_DAYS = 7;
const MAX_RESULTS = 10;
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

const thumbnailSchema = z.object({ url: z.string() });

const searchItemSchema = z.object({
  id: z.object({ videoId: z.string() }),
  snippet: z.object({
    title: z.string(),
    publishedAt: z.string(),
    thumbnails: z.object({
      high: thumbnailSchema.optional(),
      medium: thumbnailSchema.optional(),
      default: thumbnailSchema.optional(),
    }),
  }),
});
const searchResponseSchema = z.object({ items: z.array(searchItemSchema) });

const statsItemSchema = z.object({
  id: z.string(),
  statistics: z.object({ viewCount: z.string() }),
});
const statsResponseSchema = z.object({ items: z.array(statsItemSchema) });

export async function fetchTrendingVideos(query: string = DEFAULT_QUERY): Promise<YouTubeTrend[]> {
  try {
    const { YOUTUBE_API_KEY } = getYouTubeEnv();
    const publishedAfter = new Date(Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const searchUrl = new URL(SEARCH_URL);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "viewCount");
    searchUrl.searchParams.set("publishedAfter", publishedAfter);
    searchUrl.searchParams.set("maxResults", String(MAX_RESULTS));
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`YouTube search request failed with status ${searchRes.status}`);
    }
    const searchData = searchResponseSchema.parse(await searchRes.json());
    if (searchData.items.length === 0) {
      return [];
    }

    // Two calls total (search + stats), batched — mind quota per library-docs.md.
    const videoIds = searchData.items.map((item) => item.id.videoId);
    const statsUrl = new URL(VIDEOS_URL);
    statsUrl.searchParams.set("part", "statistics");
    statsUrl.searchParams.set("id", videoIds.join(","));
    statsUrl.searchParams.set("key", YOUTUBE_API_KEY);

    const statsRes = await fetch(statsUrl);
    if (!statsRes.ok) {
      throw new Error(`YouTube videos request failed with status ${statsRes.status}`);
    }
    const statsData = statsResponseSchema.parse(await statsRes.json());
    const viewCounts = new Map(statsData.items.map((item) => [item.id, Number(item.statistics.viewCount)]));

    return searchData.items.map((item) => ({
      externalId: item.id.videoId,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail:
        item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
      publishedAt: item.snippet.publishedAt,
      viewCount: viewCounts.get(item.id.videoId) ?? 0,
    }));
  } catch (error) {
    logger.error("services/youtube", "Failed to fetch trending videos", error);
    return [];
  }
}
