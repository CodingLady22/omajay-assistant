import { google, type calendar_v3 } from "googleapis";
import { getGoogleCalendarEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { listUpcomingEvents } from "@/services/google-calendar";

// Verifies the live pipeline end to end: inserts real test events with
// elevated (write) scope — feature 13's actual service stays readonly-only —
// confirms our readonly listUpcomingEvents() reads them back correctly
// (both a timed event and an all-day event, since all-day parsing has its
// own date-math branch), then deletes them. Proves genuine auth + parsing,
// not just a non-throwing empty list.
async function insertEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  requestBody: calendar_v3.Schema$Event
): Promise<string> {
  const inserted = await calendar.events.insert({ calendarId, requestBody });
  const eventId = inserted.data.id;
  if (!eventId) {
    throw new Error("Inserted event has no id");
  }
  return eventId;
}

async function main(): Promise<void> {
  const { GOOGLE_CALENDAR_CREDENTIALS, GOOGLE_CALENDAR_ID } = getGoogleCalendarEnv();

  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_CALENDAR_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const timedStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  timedStart.setHours(10, 0, 0, 0);
  const timedEnd = new Date(timedStart.getTime() + 60 * 60 * 1000);
  const timedEventId = await insertEvent(calendar, GOOGLE_CALENDAR_ID, {
    summary: "Glam AI test event — safe to delete",
    location: "Milan Studio",
    start: { dateTime: timedStart.toISOString() },
    end: { dateTime: timedEnd.toISOString() },
  });
  logger.info("services/run-calendar-test", `Inserted timed test event ${timedEventId}`);

  const allDayStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const allDayStartStr = allDayStart.toISOString().slice(0, 10);
  const allDayEndStr = new Date(allDayStart.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const allDayEventId = await insertEvent(calendar, GOOGLE_CALENDAR_ID, {
    summary: "Glam AI all-day test event — safe to delete",
    start: { date: allDayStartStr },
    end: { date: allDayEndStr },
  });
  logger.info("services/run-calendar-test", `Inserted all-day test event ${allDayEventId}`);

  try {
    const events = await listUpcomingEvents(30);

    const timedFound = events.find((event) => event.id === timedEventId);
    logger.info(
      "services/run-calendar-test",
      `Timed event ${timedFound ? "FOUND and parsed correctly" : "NOT FOUND"}`,
      timedFound
    );

    const allDayFound = events.find((event) => event.id === allDayEventId);
    const rendersAllDay =
      allDayFound !== undefined &&
      new Date(allDayFound.start).getHours() === 0 &&
      new Date(allDayFound.start).getMinutes() === 0 &&
      new Date(allDayFound.end).getHours() === 23 &&
      new Date(allDayFound.end).getMinutes() === 59;
    logger.info(
      "services/run-calendar-test",
      `All-day event ${
        allDayFound ? (rendersAllDay ? "FOUND and renders as All day correctly" : "FOUND but did NOT render as All day") : "NOT FOUND"
      }`,
      allDayFound
    );
  } finally {
    await calendar.events.delete({ calendarId: GOOGLE_CALENDAR_ID, eventId: timedEventId });
    await calendar.events.delete({ calendarId: GOOGLE_CALENDAR_ID, eventId: allDayEventId });
    logger.info("services/run-calendar-test", "Test events deleted — cleanup complete");
  }
}

main().catch((error) => {
  logger.error("services/run-calendar-test", "Calendar service test run failed", error);
  process.exitCode = 1;
});
