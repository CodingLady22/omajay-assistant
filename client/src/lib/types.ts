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

export type ScriptStatus = "draft" | "posted";

type ScriptCommon = {
  _id?: string;
  title: string;
  trend_id?: string;
  hashtags: string[];
  // Carried for schema fidelity — ScriptCard doesn't render a status badge yet,
  // there's no design mock for one.
  status: ScriptStatus;
  created_at: string;
};

export type ReelScript = ScriptCommon & {
  kind: "reel";
  hook: string;
  body: string;
  cta: string;
};

export type CaptionScript = ScriptCommon & {
  kind: "caption";
  variants: string[];
};

export type CarouselScript = ScriptCommon & {
  kind: "carousel";
  // Carried for schema fidelity, mirroring server/src/types/index.ts — content-agent
  // doesn't generate this kind yet, ScriptCard renders a placeholder for it.
  text: string;
};

// Mirrors server/src/types/index.ts's `ScriptDoc` (the `scripts` collection schema)
// as it arrives over JSON — same discriminated-union shape, _id/created_at as strings.
export type Script = ReelScript | CaptionScript | CarouselScript;
