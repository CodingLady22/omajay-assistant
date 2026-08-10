export type TrendPlatform = "instagram" | "youtube" | "tiktok";

// Mirrors server/src/types/index.ts's `Trend` (the `trends` collection schema)
// as it arrives over JSON — _id is a string, scanned_at is an ISO string.
export type Trend = {
  _id?: string;
  platform: TrendPlatform;
  external_id: string;
  title: string;
  url: string;
  thumbnail?: string;
  metric: string;
  metric_value: number;
  relevance: number;
  summary: string;
  scanned_at: string;
};
