# Memory — Feature 14: Calendar Add (Propose Then Confirm)

Last updated: 2026-08-19

## What was built

**Feature 14, built via `/architect` → build → `/review` (found 1 Important + 1 Minor, both fixed and re-verified live) → tick progress-tracker.** Branch `calendarAdd`, off `main` (post-feature-13 merge, PR #13). `calendar_add` is now real: she asks in chat, gets a `proposed` row in Mongo (never touched Google), then confirms or discards from the dashboard.

- `server/src/services/google-calendar.ts` — scope widened from `calendar.readonly` to full `https://www.googleapis.com/auth/calendar`; `createEvent(event: NewEvent): Promise<string>` added (builds `{dateTime, timeZone}` start/end, calls `calendar.events.insert`, throws — does not degrade — on failure or a missing returned id).
- `server/src/agents/calendar-agent.ts` — added the full add pipeline: `extractEvent()` (LLM structured extraction, temp 0.3), `proposeEvent()` (inserts the Mongo `proposed` row, builds the reply text), `getCalendarView()` (merges live Google events + Mongo `proposed` rows for the dashboard), `confirmProposedEvent(eventId)` and `discardProposedEvent(eventId)` (plain exported functions, not graph nodes — called only from their routes). `calendarAgent()` now branches on `calendar_add` vs `calendar_read`.
- `server/src/routes/calendar.ts` — `GET /` now calls `getCalendarView()`; added `POST /confirm` and `POST /discard`, both zod-validated `{ eventId }`.
- `server/src/types/index.ts` — `NewEvent` (createEvent's input) and `EventExtraction` (nullable pre-validation LLM shape) added.
- `server/src/agents/run-calendar-add-test.ts` — new, permanent `npm run calendar-add:test`. Proposes through the real compiled graph, confirms via the real function, then **independently re-reads the event straight from the Google API** (not through our own `listUpcomingEvents()`) to prove the write-scope widening actually works before cleaning up both the Google event and the Mongo row. Also verifies discard.
- `server/package.json` — `calendar-add:test` script added.
- Client: `lib/api.ts` (`confirmCalendarEvent`/`discardCalendarEvent`), `EventItem.tsx` (Pending badge + inline Confirm/Discard, in-flight disable, error message on failure), `Chip.tsx` (disabled-state classes, shared component), `CalendarPage.tsx` (`refetch` wired into each `EventItem`).
- `context/progress-tracker.md` and `context/ui-registry.md` also updated (feature ticked, full decisions trail, `EventItem`/`Chip` registry entries updated via `/imprint`) — not part of the PR file list below since that's server/client only, but worth knowing they're current.

## Decisions made

- **Confirm/discard bypass the LangGraph entirely.** `POST /api/calendar/confirm` and `/discard` call plain functions directly, same pattern `GET /api/calendar` already used since feature 13. `createEvent` is reachable from exactly one call site (`confirmProposedEvent`) — the "never write directly from the agent" safety rule holds structurally, not by convention. `AgentState.approval` stays unused.
- **No date/timezone library added.** The extraction prompt gets "now" in `profile.timezone` and returns naive local wall-clock ISO strings (no offset); `createEvent` sends those to Google alongside `timeZone: profile.timezone` and lets Google resolve the real instant. Verified live: a 10:00 Rome proposal landed in Google as `08:00Z` with `timeZone: "Europe/Rome"` attached.
- **Mongo `events.start`/`end` store wall-clock numbers reinterpreted as UTC**, not real UTC instants (`parseLocalDateTime`/`toLocalDateTimeString` in `calendar-agent.ts` are the exact inverse pair). Keeps `start`/`end` as real `Date` values matching the existing `EventDoc` schema, with zero timezone-math dependencies. Single-user app; a mid-flight `profile.timezone` change between propose and confirm would drift the label — accepted, low-probability risk.
- **Discard is in scope**, beyond what `build-plan.md` originally specified (propose + confirm only) — explicit developer call, made during `/architect`. Deletes the Mongo row outright rather than adding a third `status` value.
- **`createEvent` throws on failure instead of degrading to empty**, a deliberate divergence from this file's own `listUpcomingEvents` (which still degrades to `[]`). A write that flips a proposal to "confirmed" must not silently swallow a real failure.
- **`confirmProposedEvent` claims the row atomically** (`findOneAndUpdate` filtered on `status: "proposed"`, not a `findOne`-then-`updateOne`) — post-review fix, closes a double-click race. If the subsequent Google write then fails, the claim is reverted back to `"proposed"` rather than stranding the row as `"confirmed"` with no `gcal_id`.

## Problems solved

- **`exactOptionalPropertyTypes: true` rejected `location: event.location` (a `string | undefined`) being passed where the target type has `location?: string`.** Both in `createEvent`'s own signature usage and in the Google API SDK's own `Schema$Event` type. Fixed with conditional spread (`...(location ? { location } : {})`) instead of assigning `undefined` explicitly, in both `google-calendar.ts` and `calendar-agent.ts`.
- **A cascaded TS error ("Property 'data' does not exist...") on `calendar.events.insert(...)` turned out to be the same `location` typing issue** — once the object literal didn't match any call overload, TS fell back to a bad overload resolution and the return type inference broke too. Fixing the `location` typing resolved both errors.
- **Playwright's default viewport made the chat send-button selector ambiguous** — a generic `button[type='submit'], button:has(svg)` selector matched the mobile hamburger button at a narrow viewport instead of the actual send button. Fixed by setting an explicit desktop viewport (1280×900) and targeting `button[aria-label='Send message']` directly.
- **Browser-driven (Playwright) confirm clicks create REAL Google Calendar writes that the self-cleaning `calendar-add:test` script has no knowledge of.** After the live UI verification pass, a real "Shoot" event was left in Sofia's actual calendar and a matching row in Mongo — both had to be found and deleted manually (via a scratch script and direct Google API query) before the session could be considered clean. Worth remembering for any future feature that verifies a write path through the browser: UI-driven writes need their own explicit cleanup, separate from any test script's built-in cleanup.

## Current state

- **Feature 14 complete, reviewed, both post-review fixes verified live, ticked in `progress-tracker.md`.** `tsc -b --noEmit` clean on both `server/` and `client/`.
- Live-verified multiple times against the real stack: full propose→confirm→independent-Google-read→cleanup cycle (`npm run calendar-add:test`); a standalone concurrency script firing two simultaneous confirms at one proposal (exactly one won, no duplicate Google event); a full Playwright pass through the real dashboard (propose via chat, two Pending rows, Confirm one/Discard the other, 0 pending remain); a route-intercepted forced-failure Playwright pass proving the error-message/button-disable fix.
- Sofia's real Google Calendar and the `events` Mongo collection were both independently confirmed empty at session end — every test event created during the session (including the one left over from a browser-driven confirm click) was found and deleted.
- **Repo state:** branch `calendarAdd`, off `main`. Nothing committed by me this session — developer commits their own work in this project, per established pattern from prior sessions.
- Dev servers stopped, ports confirmed free at session end.

## Next session starts with

**Feature 15 — DMs Panel (Full UI, Mock)**, per `build-plan.md` Phase 6: filtered DM list matching the design (avatar, name + classification badge, preview, timestamp, unread dot), mock brand-inquiry and active-collab rows, no backend work yet. Run `/architect` first per the project's loop.

## Open questions

- Whether the dev/test calendar (a service-account-owned calendar set up as a "tester") gets swapped for Sofia's real shared calendar before production — carried over from feature 13, now more relevant since writes are live, not just reads. Not addressed this session.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, no action needed yet.

---

## PR Summary — Feature 14: Calendar Add (Propose Then Confirm)

**What this PR does:** Makes `calendar_add` real. She asks in chat ("add a shoot Monday 10am in Milan"); the agent extracts a structured event via one LLM call and writes a `proposed` row to Mongo — Google Calendar is never touched at this point. The Calendar dashboard panel now merges live Google events with pending proposals; each proposal shows a "Pending" badge with **Confirm** and **Discard** actions. Confirm calls a new `createEvent` (write scope now full calendar access, was read-only) and flips the row to `confirmed`; Discard deletes it. Neither action goes through the LangGraph — both are plain functions called directly by their routes, keeping the "never write to Google from the agent" safety rule structural rather than conventional.

**Major changes:**
- `services/google-calendar.ts`: OAuth scope widened to full calendar write access; new `createEvent()` that throws (rather than degrades) on failure, since a swallowed failure here would falsely mark a proposal confirmed.
- `agents/calendar-agent.ts`: full propose → confirm → discard pipeline. Event times are extracted as naive local wall-clock strings and paired with `profile.timezone` at the point of calling Google — no timezone-math library needed anywhere in the codebase.
- `confirmProposedEvent` claims its Mongo row atomically (`findOneAndUpdate` filtered on `status: "proposed"`) so two near-simultaneous confirm clicks can't both write to Google; a failed Google write reverts the claim.
- New `POST /api/calendar/confirm` and `POST /api/calendar/discard` routes.
- New permanent live-verification script (`npm run calendar-add:test`) that independently re-reads a confirmed event straight from the Google API (not through the app's own read path) before cleaning up — proves the write-scope change actually works, not just that the code didn't throw.
- Client: `EventItem` renders the Pending badge + Confirm/Discard actions, disables both while a request is in flight, and surfaces a human-readable error message on failure instead of failing silently. `Chip` gained shared `disabled:*` styling.

**Files changed:**

*server/*
- `server/src/services/google-calendar.ts` (modified — scope widened, `createEvent` added)
- `server/src/agents/calendar-agent.ts` (modified — propose/confirm/discard pipeline added)
- `server/src/routes/calendar.ts` (modified — `POST /confirm`, `POST /discard` added, `GET /` repointed)
- `server/src/types/index.ts` (modified — `NewEvent`, `EventExtraction` added)
- `server/src/agents/run-calendar-add-test.ts` (new)
- `server/package.json` (modified — `calendar-add:test` script)

*client/*
- `client/src/lib/api.ts` (modified — `confirmCalendarEvent`, `discardCalendarEvent` added)
- `client/src/components/calendar/EventItem.tsx` (modified — Pending badge, inline Confirm/Discard, in-flight disable, error display)
- `client/src/components/common/Chip.tsx` (modified — disabled-state classes)
- `client/src/pages/CalendarPage.tsx` (modified — `refetch` wired into `EventItem`)
