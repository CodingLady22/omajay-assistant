import type { ObjectId } from "mongodb";

export type Profile = {
  _id?: ObjectId;
  name: string;
  handle: string;
  whatsapp_number: string;
  niche: string;
  style_notes: string;
  briefing_time: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
};

export type Trend = {
  _id?: ObjectId;
  platform: "instagram" | "youtube" | "tiktok";
  external_id: string;
  title: string;
  url: string;
  thumbnail?: string;
  metric: string;
  metric_value: number;
  relevance: number;
  summary: string;
  scanned_at: Date;
};

export type ScriptBody = {
  hook: string;
  body: string;
  cta: string;
  variants?: string[];
};

export type ScriptDoc = {
  _id?: ObjectId;
  kind: "reel" | "caption" | "carousel";
  title: string;
  trend_id?: ObjectId;
  body: ScriptBody;
  hashtags: string[];
  status: "draft" | "posted";
  created_at: Date;
};

export type Dm = {
  _id?: ObjectId;
  ig_thread_id: string;
  sender_name: string;
  sender_handle: string;
  last_message: string;
  classification: "brand_inquiry" | "active_collab" | "ignore";
  summary: string;
  draft_reply: string;
  unread: boolean;
  fetched_at: Date;
};

export type EventDoc = {
  _id?: ObjectId;
  gcal_id: string | null;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  status: "confirmed" | "proposed";
  created_at: Date;
};

export type DocumentChunk = {
  _id?: ObjectId;
  doc_type: "rate_card" | "contract";
  source: string;
  chunk: string;
  embedding: number[];
  created_at: Date;
};

export type ContractDoc = {
  _id?: ObjectId;
  brand: string;
  deal_summary: string;
  terms: Record<string, unknown>;
  pdf_path: string;
  sources: string[];
  status: "draft" | "sent";
  created_at: Date;
};

export type Briefing = {
  _id?: ObjectId;
  sent_at: Date;
  content: string;
  her_reply?: string;
};

export type AgentRun = {
  _id?: ObjectId;
  run_id: string;
  channel: "whatsapp" | "web";
  intent?: string;
  input: string;
  response?: string;
  status: "running" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
};

export type AgentLog = {
  _id?: ObjectId;
  run_id: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: unknown;
  created_at: Date;
};
