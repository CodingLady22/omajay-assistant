import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections } from "@/db/collections";
import { getProfile } from "@/db/profile";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { extractJson } from "@/lib/utils";
import { createEvent, listUpcomingEvents } from "@/services/google-calendar";
import type { AgentState } from "@/agents/state";
import type { CalendarEventView, EventColor, EventDoc, EventExtraction, GoogleCalendarEvent, Profile } from "@/types";

const DAYS_AHEAD = 14;
// No real per-event category signal exists yet (Google events carry no field
// matching our 4-token palette) — default every real event to the brand
// color rather than fabricate a mapping. See progress-tracker.md, feature 13.
const DEFAULT_COLOR: EventColor = "pink";
const DEFAULT_DURATION_HOURS = 1;

function mapEvent(event: GoogleCalendarEvent): CalendarEventView {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    location: event.location,
    color: DEFAULT_COLOR,
    status: "confirmed",
  };
}

export async function getUpcomingEvents(days: number = DAYS_AHEAD): Promise<CalendarEventView[]> {
  const raw = await listUpcomingEvents(days);
  return raw
    .filter((event) => event.status !== "cancelled")
    .map(mapEvent)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function isAllDay(event: CalendarEventView): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
}

function formatEventLine(event: CalendarEventView): string {
  const start = new Date(event.start);
  const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  const timeLabel = isAllDay(event)
    ? "All day"
    : start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const locationSuffix = event.location ? ` (${event.location})` : "";
  return `${dateLabel} · ${timeLabel} — ${event.title}${locationSuffix}`;
}

function buildEventsSummary(events: CalendarEventView[]): string {
  if (events.length === 0) {
    return "You don't have anything on your calendar for the next two weeks.";
  }
  const lines = events.slice(0, 8).map(formatEventLine);
  return `Here's what's coming up:\n${lines.join("\n")}`;
}

// --- Calendar Add (propose then confirm) ---
//
// Event times are stored as their wall-clock numbers reinterpreted as UTC
// (not real UTC instants) — parseLocalDateTime/toLocalDateTimeString are an
// exact inverse pair for this. This lets start/end stay real `Date` values
// (matching EventDoc's schema) and supports simple duration arithmetic with
// no timezone library, while the actual zone identity (profile.timezone) is
// only ever attached at the moment we call Google — never baked into the
// stored value itself. Never call a local-timezone-sensitive Date method
// (toLocaleString without an explicit timeZone, getHours(), etc.) on these —
// always the UTC-prefixed accessors.
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

function isValidLocalDateTime(value: string): boolean {
  return LOCAL_DATETIME_PATTERN.test(value);
}

function parseLocalDateTime(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unexpected local datetime format: ${value}`);
  }
  const [, year, month, day, hour, minute, second = "00"] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
}

function toLocalDateTimeString(date: Date): string {
  return date.toISOString().slice(0, 19);
}

function addHours(value: string, hours: number): string {
  const date = parseLocalDateTime(value);
  date.setUTCHours(date.getUTCHours() + hours);
  return toLocalDateTimeString(date);
}

function formatLocalRange(start: string, end: string): string {
  const startDate = parseLocalDateTime(start);
  const endDate = parseLocalDateTime(end);
  const dateLabel = startDate.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  const startTime = startDate.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = endDate.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dateLabel} · ${startTime}–${endTime}`;
}

function formatNow(timezone: string): string {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENT_EXTRACTION_PROMPT = `You extract a calendar event from a message asking to add or schedule something, for a makeup/beauty content creator's assistant.

You are given the current date and time in her timezone, then her message.

Extract:
- title: a short event title (e.g. "Shoot", "Client call with Velour")
- start: the event's start date and time, as a local wall-clock ISO string with NO timezone offset, e.g. "2026-08-24T10:00:00" — resolve relative dates ("Monday", "tomorrow", "next Tuesday") against the current date/time given
- end: the event's end date and time, same format — if she doesn't state a duration or end time, respond with null (a default duration will be used)
- location: a short location string, or null if none is given

If you cannot confidently determine BOTH a title and a start date/time from the message, respond with null for title and null for start.

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{"title": "..." or null, "start": "..." or null, "end": "..." or null, "location": "..." or null}`;

const eventExtractionSchema = z.object({
  title: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  location: z.string().nullable(),
});

async function extractEvent(message: string, timezone: string): Promise<EventExtraction> {
  const prompt = `Current date and time: ${formatNow(timezone)} (${timezone})\n\nHer message: "${message}"`;
  const result = await llm.invoke([
    { role: "system", content: EVENT_EXTRACTION_PROMPT },
    { role: "user", content: prompt },
  ]);
  const raw = typeof result.content === "string" ? result.content : String(result.content);
  return eventExtractionSchema.parse(JSON.parse(extractJson(raw)));
}

const CLARIFICATION_MESSAGE =
  "I couldn't quite catch the event details — try again with a specific date, time, and what it's for.";

async function proposeEvent(message: string, profile: Profile | null): Promise<string> {
  const timezone = profile?.timezone ?? "UTC";

  let extraction: EventExtraction;
  try {
    extraction = await extractEvent(message, timezone);
  } catch (error) {
    logger.error("agents/calendar-agent", "Event extraction failed", error);
    return CLARIFICATION_MESSAGE;
  }

  if (!extraction.title || !extraction.start || !isValidLocalDateTime(extraction.start)) {
    return CLARIFICATION_MESSAGE;
  }

  const start = extraction.start;
  const end = extraction.end && isValidLocalDateTime(extraction.end) ? extraction.end : addHours(start, DEFAULT_DURATION_HOURS);
  const location = extraction.location ?? undefined;

  await collections.events().insertOne({
    gcal_id: null,
    title: extraction.title,
    start: parseLocalDateTime(start),
    end: parseLocalDateTime(end),
    ...(location ? { location } : {}),
    status: "proposed",
    created_at: new Date(),
  });

  const range = formatLocalRange(start, end);
  const locationSuffix = location ? ` at ${location}` : "";
  return `Got it — I've drafted "${extraction.title}" for ${range}${locationSuffix}. Head to the Calendar tab on your dashboard to confirm it before it's added.`;
}

function proposedDocToView(doc: EventDoc): CalendarEventView {
  return {
    // Mongo's _id, not a gcal_id — this event doesn't have one yet.
    id: doc._id!.toString(),
    title: doc.title,
    start: toLocalDateTimeString(doc.start),
    end: toLocalDateTimeString(doc.end),
    location: doc.location ?? "",
    color: DEFAULT_COLOR,
    status: "proposed",
  };
}

// Merges live Google events with pending Mongo proposals for the dashboard.
// Confirmed events carry a real UTC offset from Google; proposed events carry
// a naive local string — comparing them via `new Date()` is good enough for
// display ordering in a single-user app, not worth a timezone library for.
export async function getCalendarView(): Promise<CalendarEventView[]> {
  const [confirmed, proposedDocs] = await Promise.all([
    getUpcomingEvents(),
    collections.events().find({ status: "proposed" }).sort({ start: 1 }).toArray(),
  ]);
  const proposed = proposedDocs.map(proposedDocToView);
  return [...confirmed, ...proposed].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

// Called only from the confirm route — never from calendarAgent/the graph.
// This is the one path allowed to call services/google-calendar.ts's
// createEvent, per code-standards.md's calendar-add safety rule.
//
// Claims the row atomically (findOneAndUpdate filtered on status: "proposed")
// BEFORE calling Google, so two near-simultaneous confirm clicks can't both
// pass a read-then-write check and create two Google events for one
// proposal — only one call's filter can match, the loser gets null back. If
// the Google write then fails, the claim is reverted so the row goes back to
// "proposed" instead of being stranded as "confirmed" with no gcal_id.
export async function confirmProposedEvent(eventId: string): Promise<CalendarEventView> {
  const claimed = await collections
    .events()
    .findOneAndUpdate(
      { _id: new ObjectId(eventId), status: "proposed" },
      { $set: { status: "confirmed" } },
      { returnDocument: "before" }
    );
  if (!claimed) {
    throw new Error(`Proposed event ${eventId} not found`);
  }

  const profile = await getProfile();
  const timezone = profile?.timezone ?? "UTC";

  try {
    const gcalId = await createEvent({
      title: claimed.title,
      start: toLocalDateTimeString(claimed.start),
      end: toLocalDateTimeString(claimed.end),
      ...(claimed.location ? { location: claimed.location } : {}),
      timeZone: timezone,
    });

    await collections.events().updateOne({ _id: claimed._id }, { $set: { gcal_id: gcalId } });

    return {
      id: gcalId,
      title: claimed.title,
      start: toLocalDateTimeString(claimed.start),
      end: toLocalDateTimeString(claimed.end),
      location: claimed.location ?? "",
      color: DEFAULT_COLOR,
      status: "confirmed",
    };
  } catch (error) {
    await collections.events().updateOne({ _id: claimed._id }, { $set: { status: "proposed" } });
    throw error;
  }
}

// Called only from the discard route. Deletes outright rather than adding a
// third status value — nothing needs an audit trail of rejected proposals.
export async function discardProposedEvent(eventId: string): Promise<void> {
  const result = await collections.events().deleteOne({ _id: new ObjectId(eventId), status: "proposed" });
  if (result.deletedCount === 0) {
    throw new Error(`Proposed event ${eventId} not found`);
  }
}

export async function calendarAgent(state: AgentState): Promise<Partial<AgentState>> {
  if (state.intent === "calendar_add") {
    try {
      const profile = await getProfile();
      return { response: await proposeEvent(state.input, profile) };
    } catch (error) {
      logger.error("agents/calendar-agent", "Failed to propose event", error);
      return { response: "Couldn't draft that event right now — try again in a moment." };
    }
  }

  if (state.intent !== "calendar_read") {
    return { response: "[calendar] stub response" };
  }

  try {
    const events = await getUpcomingEvents();
    return { response: buildEventsSummary(events) };
  } catch (error) {
    logger.error("agents/calendar-agent", "Failed to get calendar events", error);
    return { response: "Couldn't reach your calendar right now — try again in a moment." };
  }
}
