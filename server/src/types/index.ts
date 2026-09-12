import type { ObjectId } from "mongodb";

// Which content categories the daily morning briefing includes — see
// agents/briefing-agent.ts. Missing/legacy profiles (predating this field)
// default every category to true; see db/profile.ts's withReminderDefaults.
export type BriefingReminders = {
  events: boolean;
  scripts: boolean;
  contracts: boolean;
  dms: boolean;
};

export type Profile = {
  _id?: ObjectId;
  name: string;
  handle: string;
  whatsapp_number: string;
  niche: string;
  style_notes: string;
  briefing_time: string;
  timezone: string;
  reminders?: BriefingReminders;
  created_at: Date;
  updated_at: Date;
};

// Presence-of-env-vars only (lib/env.ts's isConfigured helpers) — GET/POST
// /api/settings's connected-accounts block, not a live API health check.
export type ConnectionStatus = {
  whatsapp: boolean;
  instagram: boolean;
  youtube: boolean;
  googleCalendar: boolean;
};

// GET/POST /api/settings's full response shape (routes/settings.ts).
export type SettingsPayload = {
  briefingTime: string;
  timezone: string;
  reminders: BriefingReminders;
  connections: ConnectionStatus;
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

// Raw per-platform shapes returned by services/*.ts — feature 08 maps these
// into the `Trend` DB shape above (see build-plan.md's feature 08 note).
export type YouTubeTrend = {
  externalId: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
};

export type InstagramTrend = {
  externalId: string;
  title: string;
  url: string;
  thumbnail: string;
  likeCount: number;
};

export type TikTokTrend = {
  externalId: string;
  title: string;
  url: string;
  thumbnail: string;
  viewCount: number;
};

// Raw shape returned by services/google-calendar.ts — start/end are already
// normalized to ISO datetime strings (all-day events get 00:00/23:59), but
// status/cancellation filtering is left to the agent, same split as trends.
export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  status: "confirmed" | "tentative" | "cancelled";
};

export type ScriptStatus = "draft" | "posted";

type ScriptCommon = {
  _id?: ObjectId;
  title: string;
  trend_id?: ObjectId;
  hashtags: string[];
  status: ScriptStatus;
  created_at: Date;
};

export type ReelScriptDoc = ScriptCommon & {
  kind: "reel";
  hook: string;
  body: string;
  cta: string;
};

export type CaptionScriptDoc = ScriptCommon & {
  kind: "caption";
  variants: string[];
};

export type CarouselScriptDoc = ScriptCommon & {
  kind: "carousel";
  // Carried for schema completeness — no design mock or generation path yet
  // (feature 11 scoped content-agent to reel + caption only).
  text: string;
};

export type ScriptDoc = ReelScriptDoc | CaptionScriptDoc | CarouselScriptDoc;

// The editable subset of a reel/caption script — no `_id`/`status`/`created_at`,
// since a draft is either brand new (generation) or an in-progress edit whose
// identity/status live on the original ScriptDoc, untouched until save. Used
// by both the chat-editing revise loop and the save route's request body.
// carousel is excluded — content-agent never generates that kind (feature 11).
export type ReelScriptDraft = { kind: "reel" } & Pick<ReelScriptDoc, "title" | "hook" | "body" | "cta" | "hashtags">;
export type CaptionScriptDraft = { kind: "caption" } & Pick<CaptionScriptDoc, "title" | "variants" | "hashtags">;
export type ScriptDraft = ReelScriptDraft | CaptionScriptDraft;

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

export type EventColor = "pink" | "coral" | "success" | "info";

// The shape GET /api/calendar and calendar-agent.ts's chat path both use.
// Read-only (feature 13) — never persisted to `events`, which stays reserved
// for proposed/confirmed writes (feature 14). `color` has no real-data source
// yet (Google events carry no field matching our 4-token palette) so it's
// always "pink" for now — see progress-tracker.md's feature 13 decisions.
export type CalendarEventView = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  color: EventColor;
  status: "confirmed" | "proposed";
};

// Input to services/google-calendar.ts's createEvent. start/end are naive
// local wall-clock ISO strings with no offset (e.g. "2026-08-24T10:00:00") —
// timeZone travels alongside so Google resolves the real UTC instant itself,
// meaning no timezone-offset math happens anywhere in this codebase.
export type NewEvent = {
  title: string;
  start: string;
  end: string;
  location?: string;
  timeZone: string;
};

// Raw output of calendar-agent.ts's event-extraction LLM call, before
// validation. Any field can fail to resolve, in which case the agent asks
// her to clarify instead of writing a proposal — see proposeEvent().
export type EventExtraction = {
  title: string | null;
  start: string | null;
  end: string | null;
  location: string | null;
};

export type DocumentChunk = {
  _id?: ObjectId;
  doc_type: "rate_card" | "contract";
  source: string;
  chunk: string;
  embedding: number[];
  created_at: Date;
};

// A single deliverable line grounded from the rate card / a past contract.
// `rate` is null when no matching rate was found in retrieved documents —
// never a guessed/estimated figure.
export type ContractDeliverable = {
  name: string;
  rate: string | null;
};

// Every field here is null when retrieval didn't cover it — the hard "never
// invent a rate or term" rule, enforced field-by-field rather than only at
// the whole-draft level. Values that ARE present are copied verbatim from a
// retrieved chunk, not paraphrased/recalculated.
export type ContractTerms = {
  deliverables: ContractDeliverable[];
  totalFee: string | null;
  paymentTerms: string | null;
  usageRights: string | null;
  exclusivity: string | null;
  timeline: string | null;
  revisions: string | null;
};

export type ContractStatus = "draft" | "sent";

export type ContractDoc = {
  _id?: ObjectId;
  brand: string;
  deal_summary: string;
  terms: ContractTerms;
  pdf_path: string;
  sources: string[];
  status: ContractStatus;
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
