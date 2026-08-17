import { readFileSync } from "node:fs";
import { google } from "googleapis";
import { z } from "zod";
import { getGoogleCalendarEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { GoogleCalendarEvent } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const DEFAULT_DAYS = 14;
const MAX_EVENTS = 50;

const serviceAccountSchema = z
  .object({
    client_email: z.string(),
    private_key: z.string(),
  })
  .passthrough();

// GOOGLE_CALENDAR_CREDENTIALS is either the raw service-account JSON (starts
// with "{") or a file path to it. File path is what local dev uses; some
// production hosts have no filesystem for a key file, so both are supported.
function loadServiceAccountCredentials(raw: string): z.infer<typeof serviceAccountSchema> {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : readFileSync(trimmed, "utf-8");
  return serviceAccountSchema.parse(JSON.parse(jsonText));
}

// Google's spec guarantees every start/end carries exactly one of date or
// dateTime, but nothing stops a malformed payload from having neither — the
// refine rejects that case at safeParse, the same skip path every other
// malformed event already goes through, rather than letting a later step
// assert a value the schema itself allows to be absent.
const eventTimeShape = z.object({ date: z.string().optional(), dateTime: z.string().optional() });
const eventTimeSchema = eventTimeShape.refine((time) => Boolean(time.date) || Boolean(time.dateTime), {
  message: "Event time must specify either date or dateTime",
});
type EventTime = z.infer<typeof eventTimeShape>;

const googleEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  start: eventTimeSchema,
  end: eventTimeSchema,
  location: z.string().optional(),
  status: z.string().optional(),
});

// Google's all-day `end.date` is exclusive (the day after the last actual
// day) — step it back one day so a single-day all-day event reports its own
// date, not the next one.
function lastAllDayDate(endDateExclusive: string): string {
  const date = new Date(`${endDateExclusive}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function extractTime(time: EventTime): { value: string; isAllDay: boolean } {
  if (time.dateTime) {
    return { value: time.dateTime, isAllDay: false };
  }
  if (time.date) {
    return { value: time.date, isAllDay: true };
  }
  // Unreachable: eventTimeSchema's refine already rejects any event time
  // missing both date and dateTime before normalizeEvent ever runs.
  return { value: "", isAllDay: true };
}

function normalizeEvent(raw: z.infer<typeof googleEventSchema>): GoogleCalendarEvent {
  const startInfo = extractTime(raw.start);
  const endInfo = extractTime(raw.end);
  const start = startInfo.isAllDay ? `${startInfo.value}T00:00:00` : startInfo.value;
  const end = startInfo.isAllDay ? `${lastAllDayDate(endInfo.value)}T23:59:00` : endInfo.value;
  const status = raw.status === "tentative" || raw.status === "cancelled" ? raw.status : "confirmed";

  return {
    id: raw.id,
    title: raw.summary ?? "(No title)",
    start,
    end,
    location: raw.location ?? "",
    status,
  };
}

export async function listUpcomingEvents(days: number = DEFAULT_DAYS): Promise<GoogleCalendarEvent[]> {
  try {
    const { GOOGLE_CALENDAR_CREDENTIALS, GOOGLE_CALENDAR_ID } = getGoogleCalendarEnv();
    const credentials = loadServiceAccountCredentials(GOOGLE_CALENDAR_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    const calendar = google.calendar({ version: "v3", auth });

    const timeMin = new Date();
    const timeMax = new Date(timeMin.getTime() + days * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: MAX_EVENTS,
    });

    const events: GoogleCalendarEvent[] = [];
    for (const item of res.data.items ?? []) {
      const parsed = googleEventSchema.safeParse(item);
      if (!parsed.success) {
        logger.warn("services/google-calendar", `Skipping malformed event ${item.id ?? "unknown"}`);
        continue;
      }
      events.push(normalizeEvent(parsed.data));
    }
    return events;
  } catch (error) {
    logger.error("services/google-calendar", "Failed to list events", error);
    return [];
  }
}
