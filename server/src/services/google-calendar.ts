import { readFileSync } from "node:fs";
import { google } from "googleapis";
import { z } from "zod";
import { getGoogleCalendarEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { GoogleCalendarEvent } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const DEFAULT_DAYS = 14;

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

const googleEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  start: z.object({ date: z.string().optional(), dateTime: z.string().optional() }),
  end: z.object({ date: z.string().optional(), dateTime: z.string().optional() }),
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

function normalizeEvent(raw: z.infer<typeof googleEventSchema>): GoogleCalendarEvent {
  const isAllDay = Boolean(raw.start.date && !raw.start.dateTime);
  const start = isAllDay ? `${raw.start.date}T00:00:00` : (raw.start.dateTime as string);
  const end = isAllDay ? `${lastAllDayDate(raw.end.date as string)}T23:59:00` : (raw.end.dateTime as string);
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
      maxResults: 50,
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
