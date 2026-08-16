import { google } from "googleapis";
import { getGoogleCalendarEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { listUpcomingEvents } from "@/services/google-calendar";

// Verifies the live pipeline end to end: inserts a real test event with
// elevated (write) scope — feature 13's actual service stays readonly-only —
// confirms our readonly listUpcomingEvents() reads it back correctly, then
// deletes it. Proves genuine auth + parsing, not just a non-throwing empty list.
async function main(): Promise<void> {
  const { GOOGLE_CALENDAR_CREDENTIALS, GOOGLE_CALENDAR_ID } = getGoogleCalendarEnv();

  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_CALENDAR_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const inserted = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: "Glam AI test event — safe to delete",
      location: "Milan Studio",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
  logger.info("services/run-calendar-test", `Inserted test event ${inserted.data.id}`);

  try {
    const events = await listUpcomingEvents(30);
    const found = events.find((event) => event.id === inserted.data.id);
    logger.info(
      "services/run-calendar-test",
      `listUpcomingEvents(30) returned ${events.length} event(s); test event ${found ? "FOUND and parsed correctly" : "NOT FOUND"}`,
      found
    );
  } finally {
    await calendar.events.delete({ calendarId: GOOGLE_CALENDAR_ID, eventId: inserted.data.id as string });
    logger.info("services/run-calendar-test", "Test event deleted — cleanup complete");
  }
}

main().catch((error) => {
  logger.error("services/run-calendar-test", "Calendar service test run failed", error);
  process.exitCode = 1;
});
