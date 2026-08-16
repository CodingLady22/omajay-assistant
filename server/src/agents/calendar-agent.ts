import { listUpcomingEvents } from "@/services/google-calendar";
import { logger } from "@/lib/logger";
import type { AgentState } from "@/agents/state";
import type { CalendarEventView, EventColor, GoogleCalendarEvent } from "@/types";

const DAYS_AHEAD = 14;
// No real per-event category signal exists yet (Google events carry no field
// matching our 4-token palette) — default every real event to the brand
// color rather than fabricate a mapping. See progress-tracker.md, feature 13.
const DEFAULT_COLOR: EventColor = "pink";

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

export async function calendarAgent(state: AgentState): Promise<Partial<AgentState>> {
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
