import { getUpcomingEvents } from "@/agents/calendar-agent";
import { collections } from "@/db/collections";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import type { CalendarEventView, ContractDoc, Dm, Profile, ScriptDoc } from "@/types";

// How far back a draft script/contract still counts as "unfinished" for the
// briefing. There is no route anywhere yet that flips a script to "posted"
// or a contract to "sent" (see progress-tracker.md's feature 22 decisions,
// which records the follow-up feature to close this gap) — without a cap,
// every draft ever created would resurface every single morning forever.
// 14 days (not 7) was chosen deliberately: a short window silently drops the
// highest-value reminders (something forgotten 10 days ago is exactly what
// this feature should surface), which would be backwards for a nudge feature.
const RECENT_WINDOW_DAYS = 14;

type BriefingContext = {
  today: string;
  events: CalendarEventView[];
  draftScripts: ScriptDoc[];
  draftContracts: ContractDoc[];
  pendingDms: Dm[];
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toDateKey(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function isEventToday(event: CalendarEventView, timezone: string): boolean {
  return toDateKey(new Date(event.start), timezone) === toDateKey(new Date(), timezone);
}

function formatToday(timezone: string): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Same 00:00–23:59 heuristic EventItem.tsx/calendar-agent.ts already use for
// "all day" detection.
function isAllDay(event: CalendarEventView): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
}

function formatEventTime(event: CalendarEventView): string {
  if (isAllDay(event)) return "all day";
  return new Date(event.start).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function daysAgoLabel(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// --- Gathering — each source is independently wrapped so one failing source
// (e.g. a Google Calendar hiccup) never blanks out the whole briefing. ---

async function gatherTodayEvents(timezone: string): Promise<CalendarEventView[]> {
  try {
    const events = await getUpcomingEvents();
    return events.filter((event) => isEventToday(event, timezone));
  } catch (error) {
    logger.error("agents/briefing-agent", "Failed to gather today's events", error);
    return [];
  }
}

async function gatherRecentDraftScripts(): Promise<ScriptDoc[]> {
  try {
    return await collections
      .scripts()
      .find({ status: "draft", created_at: { $gte: daysAgo(RECENT_WINDOW_DAYS) } })
      .sort({ created_at: 1 })
      .toArray();
  } catch (error) {
    logger.error("agents/briefing-agent", "Failed to gather draft scripts", error);
    return [];
  }
}

async function gatherRecentDraftContracts(): Promise<ContractDoc[]> {
  try {
    return await collections
      .contracts()
      .find({ status: "draft", created_at: { $gte: daysAgo(RECENT_WINDOW_DAYS) } })
      .sort({ created_at: 1 })
      .toArray();
  } catch (error) {
    logger.error("agents/briefing-agent", "Failed to gather draft contracts", error);
    return [];
  }
}

async function gatherPendingDms(): Promise<Dm[]> {
  try {
    return await collections
      .dms()
      .find({ classification: { $ne: "ignore" } })
      .toArray();
  } catch (error) {
    logger.error("agents/briefing-agent", "Failed to gather pending DMs", error);
    return [];
  }
}

async function gatherContext(profile: Profile | null): Promise<BriefingContext> {
  const timezone = profile?.timezone ?? "UTC";
  const [events, draftScripts, draftContracts, pendingDms] = await Promise.all([
    gatherTodayEvents(timezone),
    gatherRecentDraftScripts(),
    gatherRecentDraftContracts(),
    gatherPendingDms(),
  ]);
  return { today: formatToday(timezone), events, draftScripts, draftContracts, pendingDms };
}

// --- Composition ---

function describeContext(context: BriefingContext): string {
  const eventsText =
    context.events.length === 0
      ? "Nothing on the calendar today."
      : context.events
          .map((event) => `- ${event.title}${event.location ? ` (${event.location})` : ""} at ${formatEventTime(event)}`)
          .join("\n");

  const scriptsText =
    context.draftScripts.length === 0
      ? "No unfinished script drafts."
      : context.draftScripts.map((script) => `- "${script.title}" (${script.kind}, drafted ${daysAgoLabel(script.created_at)})`).join("\n");

  const contractsText =
    context.draftContracts.length === 0
      ? "No unsent contract drafts."
      : context.draftContracts.map((contract) => `- ${contract.brand} (drafted ${daysAgoLabel(contract.created_at)})`).join("\n");

  const dmsText =
    context.pendingDms.length === 0
      ? "No brand DMs waiting on a reply."
      : context.pendingDms.map((dm) => `- ${dm.sender_name} (${dm.classification})`).join("\n");

  return `Today: ${context.today}\n\nCalendar:\n${eventsText}\n\nUnfinished script drafts:\n${scriptsText}\n\nUnsent contract drafts:\n${contractsText}\n\nBrand DMs needing a reply:\n${dmsText}`;
}

const BRIEFING_SYSTEM_PROMPT = `You write Sofia's short morning briefing message, from her AI assistant for her makeup/beauty content business.

You're given today's date, today's calendar, her unfinished script drafts, unsent contract drafts, and brand DMs needing a reply.

Write a warm, concise briefing (3-5 sentences, plain text, no markdown, no headers or bullet lists) that:
- Greets her and mentions today's day/date
- Summarizes what's on today's calendar, or says the day is open if nothing is scheduled
- Reminds her of anything unfinished ONLY if something is actually listed — never invent a reminder that isn't in the given lists
- If everything given is empty (nothing today, nothing unfinished, no DMs waiting), say so briefly and positively — don't force a reminder that doesn't apply, don't pad the message
- Ends by asking what her plan is for the day

Keep it WhatsApp-friendly: short and plain.`;

// Exported (alongside buildFallbackBriefing/BriefingContext) so the verify
// script can exercise the all-empty path directly, not just whatever the
// real database happens to contain right now.
export async function composeBriefing(context: BriefingContext): Promise<string> {
  try {
    const result = await llm.invoke([
      { role: "system", content: BRIEFING_SYSTEM_PROMPT },
      { role: "user", content: describeContext(context) },
    ]);
    const raw = typeof result.content === "string" ? result.content : String(result.content);
    const text = raw.trim();
    if (!text) throw new Error("Empty briefing response");
    return text;
  } catch (error) {
    logger.error("agents/briefing-agent", "Briefing composition failed, using fallback", error);
    return buildFallbackBriefing(context);
  }
}

export function buildFallbackBriefing(context: BriefingContext): string {
  const hasEvents = context.events.length > 0;
  const hasUnfinished = context.draftScripts.length > 0 || context.draftContracts.length > 0 || context.pendingDms.length > 0;

  const scheduleLine = hasEvents
    ? `Today you've got ${context.events.length} thing${context.events.length === 1 ? "" : "s"} on the calendar.`
    : "Nothing on your calendar today.";

  const reminders: string[] = [];
  if (context.draftScripts.length > 0) {
    reminders.push(`${context.draftScripts.length} script draft${context.draftScripts.length === 1 ? "" : "s"}`);
  }
  if (context.draftContracts.length > 0) {
    reminders.push(`${context.draftContracts.length} contract${context.draftContracts.length === 1 ? "" : "s"} to send`);
  }
  if (context.pendingDms.length > 0) {
    reminders.push(`${context.pendingDms.length} brand DM${context.pendingDms.length === 1 ? "" : "s"} waiting on a reply`);
  }
  const reminderLine = hasUnfinished ? `Still open: ${reminders.join(", ")}.` : "Nothing outstanding right now.";

  return `Good morning! ${scheduleLine} ${reminderLine} What's your plan for today?`;
}

export type { BriefingContext };

export async function buildBriefing(profile: Profile | null): Promise<string> {
  const context = await gatherContext(profile);
  return composeBriefing(context);
}
