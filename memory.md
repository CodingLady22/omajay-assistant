# Memory — Feature 13: Calendar Read

Last updated: 2026-08-16

## What was built

**Feature 13, built via `/architect` → build → `/review` (2 passes — pre-fix and post-fix, both live) → tick progress-tracker.** Branch `calendarRead`, off `main` (post-feature-12 merge, PR #12). Real Google Calendar integration replacing feature 12's mock data.

- `server/src/services/google-calendar.ts` — new. Service-account auth via `googleapis`; `listUpcomingEvents(days = 14)`. Credential loader (`loadServiceAccountCredentials`) tolerates **both** a file path and an inline JSON string (detects a leading `{`) — local dev uses a file path, some production hosts have no filesystem for a key file. `eventTimeSchema` has a zod `.refine()` rejecting any event `start`/`end` missing both `date` and `dateTime` at `safeParse` — malformed events get skipped the same way every other malformed field already does. `extractTime()` narrows the validated union without any `as` assertion (see Problems Solved). Read-only scope (`calendar.readonly`) — feature 14 will need to widen this for writes.
- `server/src/agents/calendar-agent.ts` — rewritten. `getUpcomingEvents()` (exported, reused by both the route and the chat path — same pattern as `getStoredTrends()`), `buildEventsSummary()` (deterministic text, no LLM call needed), `calendarAgent()` branches on `state.intent`: `calendar_read` does real work, `calendar_add` still returns its original feature-03 stub untouched.
- `server/src/routes/calendar.ts` — new. `GET /api/calendar` calls into the agent module (not a raw service call), matching the `routes/trends.ts` → `getStoredTrends()` boundary precedent.
- `server/src/index.ts` — new router mounted at `/api/calendar`.
- `server/src/lib/env.ts` — `GOOGLE_CALENDAR_ID` added to `getGoogleCalendarEnv()`.
- `server/src/types/index.ts` — `GoogleCalendarEvent` (raw service shape), `EventColor`, `CalendarEventView` (the `GET /api/calendar` response shape) added.
- `server/src/services/run-calendar-test.ts` — new, permanent `npm run calendar:test` script (mirrors `trends:test`/`jobs:test`). Inserts a real timed event **and** a real all-day event via elevated write-scope test-only calls, confirms both are read back correctly through the actual readonly service, then deletes them.
- `server/package.json` — `googleapis` added as a dependency.
- `server/.env.example` — `GOOGLE_CALENDAR_ID` documented; credentials comment updated to note file-path-or-inline-JSON.
- Client: `client/src/lib/types.ts` (`CalendarEvent`/`EventColor` consolidated in, mirroring how features 08/11 handled `Trend`/`Script`), `client/src/lib/mock-events.ts` deleted, `client/src/lib/api.ts` (`getCalendarEvents()` added), `CalendarGrid.tsx`/`EventItem.tsx` (import path only, no visual change), `CalendarPage.tsx` (rewritten — real fetch with loading/error states matching `TrendsPage.tsx`'s exact pattern, redundant client-side sort removed since the server already returns pre-sorted data).
- Root `.gitignore` — new (didn't exist before). Covers `service-account-key.json`, which lives at the repo root — `server/.gitignore` already listed the filename but that rule only reaches paths under `server/`.
- `context/progress-tracker.md` — feature 13 ticked, full Decisions/Notes trail recorded (not part of the PR's server/client file list below, but worth knowing it's updated).

## Decisions made

- **No caching into the `events` Mongo collection — `GET /api/calendar` and the chat path both read live from Google every time.** A calendar read is one cheap API call with no LLM step to amortize (unlike trends' 3-API + LLM-scoring pipeline); `events` stays reserved for proposed/confirmed writes only (feature 14).
- **`EventItem`'s dot color always defaults to `pink` for real events** — no field in Google Calendar's data maps to the 4-token palette unless she manually color-codes events there, which can't be assumed. Closes the open question feature 12 left behind.
- **Fixed 14-day window, no natural-language date-range parsing.** "What's on this week?" and "what's on today?" return the same list — kept deterministic and LLM-free, out of scope for this feature.
- **Credential loader tolerates both a file path and inline JSON** — explicit developer requirement (mid-session correction) so switching to an env-string on a filesystem-less production host later needs zero code changes, just an env var swap.
- **`calendar_add` intent is untouched** — still returns its original stub; feature 14 owns the propose-then-confirm write flow.

## Problems solved

- **`service-account-key.json` (repo root) was not actually gitignored.** `server/.gitignore` listed the filename, but `.gitignore` rules in a subdirectory only reach that subdirectory's tree — the key file sits one level above `server/`. Confirmed via `git check-ignore -v` (no match) and `git status` (showed as untracked/exposed). Fixed by adding a root-level `.gitignore`. Re-confirmed ignored afterward.
- **`GOOGLE_CALENDAR_CREDENTIALS` path was relative to the wrong cwd.** It was set to `./service-account-key.json`, but `npm run dev`'s cwd is `server/`, and the key file is one level above that — fixed to `../service-account-key.json`.
- **Uncommented `as string` type assertions in `normalizeEvent`** (found during `/review`) were both a code-standards violation (zero precedent anywhere else in `server/src`, confirmed via a full grep) and a latent bug: the zod schema at the time allowed an event's `start`/`end` to have neither `date` nor `dateTime`, so the assertion could let `undefined` silently flow through typed as `string`, producing "Invalid Date" downstream instead of being skipped like every other malformed event. Fixed with a zod `.refine()` on `eventTimeSchema` (rejects the missing-both case at `safeParse`) plus a control-flow-narrowing `extractTime()` helper — its truthy checks exactly mirror the refine's `Boolean()` checks, so the one remaining fallback branch is provably unreachable. Verified live against a real all-day event (previously the untested path).
- **Vite binds to IPv6 loopback (`[::1]:5173`) by default, not `127.0.0.1`.** Playwright screenshot script had to target `http://localhost:5173`, not `127.0.0.1` — the inverse of the `127.0.0.1`-over-`localhost` fix from feature 12's session; both quirks are shell/tool-specific, not real server issues.
- **Background dev-server processes survived `TaskStop` calls** — the npm parent process was stopped but the underlying `tsx watch`/`vite` child kept the port bound. Had to `netstat -ano` for the actual listening PID and `taskkill //PID <pid> //F` directly.

## Current state

- **Feature 13 complete: built, reviewed twice (pre-fix: 1 Important + 2 Minor found; post-fix: re-reviewed and re-verified live, 0 remaining issues), ready to ship.** `tsc -b --noEmit` clean on both `server/` and `client/`. Playwright confirmed `/calendar` at all 3 responsive breakpoints against real data — zero console/page errors both before and after the fix pass.
- Live-verified end to end multiple times: real timed + all-day events inserted via elevated test-only calls, read back correctly through the actual readonly service, then deleted (calendar left empty each time — no leftover test data). `GET /api/calendar` and the `calendar_read` chat path both confirmed against real data; `calendar_add` confirmed still returns its unchanged stub.
- **Repo state:** branch `calendarRead`. Developer committed the pre-fix server-side work themselves as `7f5fb09` ("feat: build read feature for calendar agent"). Client-side files, `context/progress-tracker.md`, the new root `.gitignore`, and the post-review fixes to `google-calendar.ts`/`run-calendar-test.ts` are still **uncommitted** — working tree is not clean. Developer commits their own work in this project; no commit made by me this session.
- Dev servers stopped, ports confirmed free at session end.

## Next session starts with

**Feature 14 — Calendar Add (Propose Then Confirm)**: parse a natural-language event request into a `proposed` row in the `events` collection (not written to Google yet), reply asking for confirmation; `POST /api/calendar/confirm` writes to Google Calendar via a new `createEvent` in `google-calendar.ts` (this is where the service's OAuth scope needs to widen from `calendar.readonly` to full `calendar` access) and flips status to `confirmed`. Run `/architect` first per the project's loop.

## Open questions

- Whether the calendar currently used for dev/testing (a service account's own calendar, set up as a "tester") will be swapped for Sofia's real shared calendar before production, or is the intended long-term setup — not addressed this session, worth confirming before feature 14 starts writing real events.
- Feature 14 needs `google-calendar.ts`'s scope widened from readonly to full `calendar` access — not built yet, just noted.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over from earlier sessions, still no action needed yet.

---

## PR Summary — Feature 13: Calendar Read

**What this PR does:** Replaces feature 12's mock Calendar panel data with a real, read-only Google Calendar integration. `calendar_read` (chat/WhatsApp) and `GET /api/calendar` (dashboard) both now return Sofia's real upcoming events via a service-account-authenticated Google Calendar API read, always fetched live (no caching). `calendar_add` is untouched — still a stub, that's feature 14.

**Major changes:**
- New `services/google-calendar.ts` — service-account auth (file-path or inline-JSON credential, tolerant of both), `listUpcomingEvents(days = 14)`, zod-validated with a refine that rejects events missing both `date` and `dateTime` on start/end.
- `calendar-agent.ts` rewritten — real `calendar_read` (fetch, map, deterministic WhatsApp-friendly summary), `calendar_add` stub left unchanged.
- New `GET /api/calendar` route, mounted in `index.ts`.
- New permanent live-verification script (`npm run calendar:test`) — inserts/reads/deletes both a timed and an all-day test event against the real API.
- Client `CalendarEvent` type consolidated into `lib/types.ts` (mock file deleted); `CalendarPage` wired to real data with loading/error states; dot color defaults to brand pink for all real events (no per-event category signal exists in Google's data).
- Fixed during review: replaced uncommented `as` type assertions with a schema-level guarantee + type-narrowing helper (closes a latent "Invalid Date" risk for malformed events); named a magic number constant; removed a redundant client-side sort.

**Files changed:**

*server/*
- `server/src/services/google-calendar.ts` (new)
- `server/src/services/run-calendar-test.ts` (new)
- `server/src/routes/calendar.ts` (new)
- `server/src/agents/calendar-agent.ts` (modified — rewritten)
- `server/src/index.ts` (modified — router mounted)
- `server/src/lib/env.ts` (modified — `GOOGLE_CALENDAR_ID` added)
- `server/src/types/index.ts` (modified — `GoogleCalendarEvent`, `EventColor`, `CalendarEventView` added)
- `server/.env.example` (modified)
- `server/.gitignore` (modified)
- `server/package.json` (modified — `googleapis` added)
- `server/package-lock.json` (modified)

*client/*
- `client/src/lib/types.ts` (modified — `CalendarEvent`/`EventColor` added)
- `client/src/lib/api.ts` (modified — `getCalendarEvents()` added)
- `client/src/lib/mock-events.ts` (deleted)
- `client/src/components/calendar/CalendarGrid.tsx` (modified — import path only)
- `client/src/components/calendar/EventItem.tsx` (modified — import path only)
- `client/src/pages/CalendarPage.tsx` (modified — rewritten for real data)
