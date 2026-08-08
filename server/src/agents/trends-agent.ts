import { z } from "zod";
import { collections } from "@/db/collections";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { extractJson } from "@/lib/utils";
import { fetchHashtagTopPosts } from "@/services/instagram";
import { fetchTrendingVideos as fetchTrendingTikToks } from "@/services/tiktok";
import { fetchTrendingVideos } from "@/services/youtube";
import type { AgentState } from "@/agents/state";
import type { InstagramTrend, Profile, TikTokTrend, Trend, YouTubeTrend } from "@/types";

const STALE_MS = 24 * 60 * 60 * 1000;
const TOP_N = 12;
const DEFAULT_TOPIC = "makeup";
const FALLBACK_RELEVANCE = 50;
const FALLBACK_SUMMARY = "Potentially relevant to your niche — scoring unavailable right now.";

type RawCandidate = Pick<Trend, "platform" | "external_id" | "title" | "url" | "thumbnail" | "metric" | "metric_value">;
type ScoredCandidate = RawCandidate & Pick<Trend, "relevance" | "summary">;

const TOPIC_EXTRACTION_PROMPT = `You extract a search topic from a message asking about trending content for a makeup/beauty content creator.
If the message names a specific topic, style, look, or theme (e.g. "bridal makeup", "glass skin", "mob wife aesthetic"), respond with just that topic in a few words.
If the message is a generic request with no specific topic (e.g. "what's trending?", "what's trending this week?", "any trends?"), respond with exactly NONE.
Respond with only the topic or NONE — no punctuation, no explanation.`;

async function getProfile(): Promise<Profile | null> {
  return collections.profile().findOne({});
}

async function extractTopic(message: string, fallback: string): Promise<string> {
  try {
    const result = await llm.invoke([
      { role: "system", content: TOPIC_EXTRACTION_PROMPT },
      { role: "user", content: message },
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const trimmed = raw.trim();
    if (!trimmed || trimmed.toUpperCase() === "NONE") {
      return fallback;
    }
    return trimmed;
  } catch (error) {
    logger.error("agents/trends-agent", "Topic extraction failed, using fallback topic", error);
    return fallback;
  }
}

function formatCount(count: number, unit: string): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M ${unit}`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K ${unit}`;
  return `${count} ${unit}`;
}

function mapYouTube(items: YouTubeTrend[]): RawCandidate[] {
  return items.map((item) => ({
    platform: "youtube",
    external_id: item.externalId,
    title: item.title,
    url: item.url,
    thumbnail: item.thumbnail,
    metric: formatCount(item.viewCount, "views"),
    metric_value: item.viewCount,
  }));
}

function mapInstagram(items: InstagramTrend[]): RawCandidate[] {
  return items.map((item) => ({
    platform: "instagram",
    external_id: item.externalId,
    title: item.title,
    url: item.url,
    thumbnail: item.thumbnail,
    metric: formatCount(item.likeCount, "likes"),
    metric_value: item.likeCount,
  }));
}

function mapTikTok(items: TikTokTrend[]): RawCandidate[] {
  return items.map((item) => ({
    platform: "tiktok",
    external_id: item.externalId,
    title: item.title,
    url: item.url,
    thumbnail: item.thumbnail,
    metric: formatCount(item.viewCount, "views"),
    metric_value: item.viewCount,
  }));
}

const scoreSchema = z.array(
  z.object({
    externalId: z.string(),
    relevance: z.number().min(0).max(100),
    summary: z.string(),
  })
);

async function scoreRelevance(candidates: RawCandidate[], profile: Profile | null): Promise<ScoredCandidate[]> {
  if (candidates.length === 0) return [];

  const niche = profile?.niche ?? DEFAULT_TOPIC;
  const styleNotes = profile?.style_notes;

  try {
    const prompt = `Score each of the following trending items 0-100 for how relevant it is to a content creator in the "${niche}" niche${
      styleNotes ? ` (style: ${styleNotes})` : ""
    }.
For each item, also write a one-sentence summary of the content angle or why it's relevant to her.

Items:
${candidates.map((c) => `- externalId: ${c.external_id} | platform: ${c.platform} | title: ${c.title}`).join("\n")}

Respond with ONLY a JSON array, no markdown, no explanation, in this exact shape:
[{"externalId": "...", "relevance": 0, "summary": "..."}]`;

    const result = await llm.invoke([{ role: "user", content: prompt }]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const parsed = scoreSchema.parse(JSON.parse(extractJson(raw)));
    const scoreByExternalId = new Map(parsed.map((entry) => [entry.externalId, entry]));

    return candidates.map((candidate) => {
      const score = scoreByExternalId.get(candidate.external_id);
      return {
        ...candidate,
        relevance: score?.relevance ?? FALLBACK_RELEVANCE,
        summary: score?.summary ?? FALLBACK_SUMMARY,
      };
    });
  } catch (error) {
    logger.error("agents/trends-agent", "Relevance scoring failed, using fallback scores", error);
    return candidates.map((candidate) => ({ ...candidate, relevance: FALLBACK_RELEVANCE, summary: FALLBACK_SUMMARY }));
  }
}

function isStale(trends: Trend[]): boolean {
  if (trends.length === 0) return true;
  const mostRecentScanMs = trends.reduce((latest, trend) => Math.max(latest, trend.scanned_at.getTime()), 0);
  return Date.now() - mostRecentScanMs > STALE_MS;
}

function buildTrendsSummary(trends: Trend[]): string {
  if (trends.length === 0) {
    return "I couldn't find any trending content right now — try again in a bit.";
  }
  const lines = trends.slice(0, 5).map((trend, index) => `${index + 1}. ${trend.title} — ${trend.metric}`);
  return `Here's what's trending right now:\n${lines.join("\n")}`;
}

export async function getStoredTrends(limit = TOP_N): Promise<Trend[]> {
  return collections.trends().find({}).sort({ relevance: -1, metric_value: -1 }).limit(limit).toArray();
}

export async function scanAndStoreTrends(topic: string, profile: Profile | null): Promise<Trend[]> {
  const [youtube, instagram, tiktok] = await Promise.all([
    fetchTrendingVideos(topic),
    fetchHashtagTopPosts(topic),
    fetchTrendingTikToks(topic),
  ]);

  const candidates = [...mapYouTube(youtube), ...mapInstagram(instagram), ...mapTikTok(tiktok)];
  if (candidates.length === 0) {
    logger.warn("agents/trends-agent", `No trend candidates found for topic "${topic}"`);
    return [];
  }

  const scored = await scoreRelevance(candidates, profile);
  const top = scored.sort((a, b) => b.relevance - a.relevance).slice(0, TOP_N);
  const scannedAt = new Date();

  await Promise.all(
    top.map((item) =>
      collections.trends().updateOne(
        { external_id: item.external_id },
        { $set: { ...item, scanned_at: scannedAt } },
        { upsert: true }
      )
    )
  );

  return top.map((item) => ({ ...item, scanned_at: scannedAt }));
}

export async function trendsAgent(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const profile = await getProfile();
    const fallbackTopic = profile?.niche ?? DEFAULT_TOPIC;
    const topic = await extractTopic(state.input, fallbackTopic);

    let trends = await getStoredTrends();
    if (isStale(trends)) {
      const scanned = await scanAndStoreTrends(topic, profile);
      if (scanned.length > 0) {
        trends = scanned;
      }
    }

    return { response: buildTrendsSummary(trends) };
  } catch (error) {
    logger.error("agents/trends-agent", "Failed to get trends", error);
    return { response: "Couldn't pull trends right now — try again in a moment." };
  }
}
