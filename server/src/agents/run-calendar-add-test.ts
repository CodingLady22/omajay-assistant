import { google } from "googleapis";
import { app } from "@/agents/graph";
import { confirmProposedEvent, discardProposedEvent } from "@/agents/calendar-agent";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { collections } from "@/db/collections";
import { getGoogleCalendarEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { EventDoc } from "@/types";

// Exercises the real propose -> confirm pipeline end to end through the
// compiled graph (real orchestrator classification, real extraction LLM
// call), then independently re-reads the confirmed event straight from the
// Google Calendar API — NOT through our own listUpcomingEvents() — so a
// silent auth/scope failure on the newly-widened write scope can't pass as
// green just because confirmProposedEvent() itself didn't throw. Cleans up
// both the Google event and the Mongo row in a finally block either way.
// Also verifies discard, on a separate proposal that never touches Google.

function googleCalendarClient() {
  const { GOOGLE_CALENDAR_CREDENTIALS, GOOGLE_CALENDAR_ID } = getGoogleCalendarEnv();
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_CALENDAR_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return { calendar: google.calendar({ version: "v3", auth }), calendarId: GOOGLE_CALENDAR_ID };
}

async function latestProposedEvent(): Promise<EventDoc | null> {
  return collections.events().findOne({ status: "proposed" }, { sort: { created_at: -1 } });
}

async function testConfirm(): Promise<void> {
  const proposeResult = await app.invoke({
    input: "Add a Glam AI test event — safe to delete — a shoot next Monday 10am in Milan",
    channel: "web",
    runId: "calendar-add-test-confirm",
  });
  logger.info("agents/run-calendar-add-test", `Propose response: ${proposeResult.response}`);
  if (proposeResult.intent !== "calendar_add") {
    throw new Error(`Expected calendar_add intent, got "${proposeResult.intent}"`);
  }

  const proposedDoc = await latestProposedEvent();
  if (!proposedDoc?._id) {
    throw new Error("No proposed event found in Mongo after propose call");
  }
  logger.info("agents/run-calendar-add-test", `Proposed Mongo row: ${proposedDoc._id.toString()}`);

  let gcalId: string | undefined;
  try {
    const confirmed = await confirmProposedEvent(proposedDoc._id.toString());
    gcalId = confirmed.id;
    logger.info("agents/run-calendar-add-test", `Confirmed — Google event id ${gcalId}`);

    // Independent proof: read straight from Google, bypassing our own code.
    const { calendar, calendarId } = googleCalendarClient();
    const res = await calendar.events.get({ calendarId, eventId: gcalId });
    if (res.data.id !== gcalId || res.data.status === "cancelled") {
      throw new Error("Event does NOT actually exist in Google Calendar — confirm reported success falsely");
    }
    logger.info("agents/run-calendar-add-test", "VERIFIED: event independently confirmed present in Google Calendar", {
      summary: res.data.summary,
      start: res.data.start,
    });

    const updatedDoc = await collections.events().findOne({ _id: proposedDoc._id });
    if (updatedDoc?.status !== "confirmed" || !updatedDoc.gcal_id) {
      throw new Error("Mongo row was not correctly flipped to confirmed with a gcal_id");
    }
    logger.info("agents/run-calendar-add-test", "VERIFIED: Mongo row correctly flipped to confirmed");
  } finally {
    if (gcalId) {
      const { calendar, calendarId } = googleCalendarClient();
      await calendar.events.delete({ calendarId, eventId: gcalId }).catch((error: unknown) => {
        logger.error("agents/run-calendar-add-test", "Failed to clean up Google test event", error);
      });
      logger.info("agents/run-calendar-add-test", "Cleaned up Google event");
    }
    await collections.events().deleteOne({ _id: proposedDoc._id });
    logger.info("agents/run-calendar-add-test", "Cleaned up Mongo row");
  }
}

async function testDiscard(): Promise<void> {
  const proposeResult = await app.invoke({
    input: "Add a Glam AI test event — safe to delete — a call next Tuesday 3pm",
    channel: "web",
    runId: "calendar-add-test-discard",
  });
  logger.info("agents/run-calendar-add-test", `Propose (for discard) response: ${proposeResult.response}`);

  const discardDoc = await latestProposedEvent();
  if (!discardDoc?._id) {
    throw new Error("No proposed event found in Mongo for discard test");
  }

  await discardProposedEvent(discardDoc._id.toString());

  const afterDiscard = await collections.events().findOne({ _id: discardDoc._id });
  if (afterDiscard !== null) {
    throw new Error("Discarded event still present in Mongo — discard did not delete it");
  }
  logger.info("agents/run-calendar-add-test", "VERIFIED: discard removes the proposed Mongo row, no Google call made");
}

async function main(): Promise<void> {
  await connectToDatabase();
  await testConfirm();
  await testDiscard();
}

main()
  .catch((error) => {
    logger.error("agents/run-calendar-add-test", "Calendar-add test run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
