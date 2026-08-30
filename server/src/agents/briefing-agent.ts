import { getEventDateKey, getUpcomingEvents, isEventAllDay, todayDateKey } from "@/agents/calendar-agent";
import { collections } from "@/db/collections";
import { withReminderDefaults } from "@/db/profile";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import type { BriefingReminders, CalendarEventView, ContractDoc, Dm, Profile, ScriptDoc } from "@/types";

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
  timezone: string;
  reminders: BriefingReminders;
  events: CalendarEventView[];
  draftScripts: ScriptDoc[];
  draftContracts: ContractDoc[];
  pendingDms: Dm[];
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Delegates to calendar-agent.ts's getEventDateKey/todayDateKey rather than
// comparing `new Date(event.start)` directly — an all-day event's start is a
// timezone-naive string, and comparing it "today" without going through the
// all-day-aware date-key logic silently reintroduces the host-timezone bug
// those helpers exist to avoid (see their comments in calendar-agent.ts).
function isEventToday(event: CalendarEventView, timezone: string): boolean {
  return getEventDateKey(event, timezone) === todayDateKey(timezone);
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

function formatEventTime(event: CalendarEventView, timezone: string): string {
  if (isEventAllDay(event)) return "all day";
  return new Date(event.start).toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
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

// A disabled category is never fetched — not fetched-then-hidden. Keeps the
// toggle honest (no DB hit, no chance of it leaking into the briefing text)
// and means describeContext/buildFallbackBriefing below don't need their own
// "is this enabled" checks for scripts/contracts/dms — an empty array reads
// identically whether nothing was found or the category was switched off.
async function gatherContext(profile: Profile | null): Promise<BriefingContext> {
  const timezone = profile?.timezone ?? "UTC";
  const reminders = withReminderDefaults(profile?.reminders);
  const [events, draftScripts, draftContracts, pendingDms] = await Promise.all([
    reminders.events ? gatherTodayEvents(timezone) : Promise.resolve([]),
    reminders.scripts ? gatherRecentDraftScripts() : Promise.resolve([]),
    reminders.contracts ? gatherRecentDraftContracts() : Promise.resolve([]),
    reminders.dms ? gatherPendingDms() : Promise.resolve([]),
  ]);
  return { today: formatToday(timezone), timezone, reminders, events, draftScripts, draftContracts, pendingDms };
}

// --- Composition ---

// A disabled category's section is left out of the context string entirely
// — not included with an "empty" placeholder — so the LLM has no way to
// mention it, on or off. Distinct from a genuinely-empty-but-enabled
// category, which still gets its section with an explicit "nothing here"
// line (context.events.length === 0 reads identically for "off" and "empty"
// upstream, but only the enabled case ever reaches this function's output).
function describeContext(context: BriefingContext): string {
  const sections: string[] = [];

  if (context.reminders.events) {
    const eventsText =
      context.events.length === 0
        ? "Nothing on the calendar today."
        : context.events
            .map((event) => `- ${event.title}${event.location ? ` (${event.location})` : ""} at ${formatEventTime(event, context.timezone)}`)
            .join("\n");
    sections.push(`Calendar:\n${eventsText}`);
  }

  if (context.reminders.scripts) {
    const scriptsText =
      context.draftScripts.length === 0
        ? "No unfinished script drafts."
        : context.draftScripts.map((script) => `- "${script.title}" (${script.kind}, drafted ${daysAgoLabel(script.created_at)})`).join("\n");
    sections.push(`Unfinished script drafts:\n${scriptsText}`);
  }

  if (context.reminders.contracts) {
    const contractsText =
      context.draftContracts.length === 0
        ? "No unsent contract drafts."
        : context.draftContracts.map((contract) => `- ${contract.brand} (drafted ${daysAgoLabel(contract.created_at)})`).join("\n");
    sections.push(`Unsent contract drafts:\n${contractsText}`);
  }

  if (context.reminders.dms) {
    const dmsText =
      context.pendingDms.length === 0
        ? "No brand DMs waiting on a reply."
        : context.pendingDms.map((dm) => `- ${dm.sender_name} (${dm.classification})`).join("\n");
    sections.push(`Brand DMs needing a reply:\n${dmsText}`);
  }

  return [`Today: ${context.today}`, ...sections].join("\n\n");
}

const BRIEFING_SYSTEM_PROMPT = `You write Sofia's short morning briefing message, from her AI assistant for her makeup/beauty content business.

You're given today's date, plus up to four sections: today's calendar, her unfinished script drafts, unsent contract drafts, and brand DMs needing a reply. She controls each section independently — a section is left out entirely when she's turned it off, not included empty. Only ever discuss a section that is actually present in what you're given.

Write a warm, concise briefing (3-5 sentences, plain text, no markdown, no headers or bullet lists) that:
- Greets her and mentions today's day/date
- If a Calendar section is given, summarizes it (or says the day is open if it says nothing's scheduled) — if no Calendar section is given, don't mention the calendar at all
- Reminds her of anything unfinished ONLY if something is actually listed in a given section — never invent a reminder for a section that wasn't given, and never invent a reminder that isn't in a given list
- If every section that IS given is empty, say so briefly and positively — don't force a reminder that doesn't apply, don't pad the message
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

// Same "skip mentioning a disabled category" rule as describeContext above,
// applied to the deterministic fallback: a line is omitted (not shown as
// "nothing here") whenever the reminder(s) it would summarize are off.
export function buildFallbackBriefing(context: BriefingContext): string {
  const { reminders } = context;
  const hasEvents = context.events.length > 0;
  const hasUnfinished = context.draftScripts.length > 0 || context.draftContracts.length > 0 || context.pendingDms.length > 0;

  const scheduleLine = !reminders.events
    ? null
    : hasEvents
      ? `Today you've got ${context.events.length} thing${context.events.length === 1 ? "" : "s"} on the calendar.`
      : "Nothing on your calendar today.";

  const reminderLines: string[] = [];
  if (context.draftScripts.length > 0) {
    reminderLines.push(`${context.draftScripts.length} script draft${context.draftScripts.length === 1 ? "" : "s"}`);
  }
  if (context.draftContracts.length > 0) {
    reminderLines.push(`${context.draftContracts.length} contract${context.draftContracts.length === 1 ? "" : "s"} to send`);
  }
  if (context.pendingDms.length > 0) {
    reminderLines.push(`${context.pendingDms.length} brand DM${context.pendingDms.length === 1 ? "" : "s"} waiting on a reply`);
  }
  const tracksUnfinished = reminders.scripts || reminders.contracts || reminders.dms;
  const reminderLine = !tracksUnfinished ? null : hasUnfinished ? `Still open: ${reminderLines.join(", ")}.` : "Nothing outstanding right now.";

  return ["Good morning!", scheduleLine, reminderLine, "What's your plan for today?"]
    .filter((line): line is string => line !== null)
    .join(" ");
}

export type { BriefingContext };

export async function buildBriefing(profile: Profile | null): Promise<string> {
  const context = await gatherContext(profile);
  return composeBriefing(context);
}
