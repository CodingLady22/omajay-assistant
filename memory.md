# Memory — Feature 12: Calendar Panel — Full UI (Mock)

Last updated: 2026-08-16

## What was built

**Feature 12, built via `/architect` → build → `/imprint` → `/review` (1 pass, 0 issues — shipped clean first pass).** Branch `calendarPanel`, off `main` (post-feature-11 merge, PR #11). Developer committed the full build themselves as `98d176a` ("feat: build mock UI for calendar") — **developer commits their own work in this project**, no commit made by me.

- `client/src/lib/mock-events.ts` — new. `CalendarEvent` type (`id`, `title`, `start`, `end`, `location`, `color`, `status`) mirroring the server `events` collection schema (architecture.md) plus a client-only `color` field the real schema doesn't have yet. 4 mock entries dated across August 2026 (Lumière shoot, podcast interview, content filming day, Velour brand call).
- `client/src/components/calendar/CalendarGrid.tsx` — new. Computes month/today from the real current date (`new Date()`), not a hardcoded date. 7-col Mon-first grid, today cell styled with the same `bg-pink-light text-pink` active triple used elsewhere, pink dot on any day with an event. Prev/next chevrons render matching the design exactly but are `disabled`, no handler.
- `client/src/components/calendar/EventItem.tsx` — new. Dot + title + derived meta line (`Wed 3 Aug · 10:00–14:00 · Milan Studio`, or `All day` when start is 00:00 and end is 23:59). Dot color pulls from the existing closed token palette (`pink`/`coral`/`success`/`info`), not two new tokens the mock's raw hex would have implied.
- `client/src/pages/CalendarPage.tsx` — rewritten, replacing `ComingSoonPanel`. Renders `CalendarGrid` + sorted event list (keyed on `event.id`) + a `+ Add event ↗` chip via `useChatPrompt()` — prefills chat, never writes directly (hard safety rule).
- `context/ui-registry.md` — `/imprint`: new `CalendarGrid` and `EventItem` entries, including a note that `EventItem`'s `rounded-md` (vs. `TrendCard`/`ScriptCard`'s `rounded-lg`) matches the design mock's own CSS exactly and isn't drift.
- `context/progress-tracker.md` — feature 12 ticked, phase still 5, full Decisions/Notes trail recorded.

No server changes this feature — pure client mock, same shape as features 06/10 before their real-data companions.

## Decisions made

- **Month/today computed from the real current date**, not the design mock's static "June 2026" — `/architect`-confirmed, since a "today highlighted" feature only makes sense against the actual day.
- **Event dot colors reuse the existing 4-token palette** (`pink`/`coral`/`success`/`info`) instead of adding two new near-duplicate green/blue tokens to match the mock's exact `#639922`/`#378ADD` — keeps `ui-tokens.md`'s palette closed. `color` is a client-only mock field; feature 13 must decide how a real Google Calendar read maps to one of these four.
- **Prev/next month chevrons render but are non-functional** (`disabled`, no handler) — real navigation deferred to feature 13 rather than building throwaway state against mock-only data.
- **`CalendarEvent` carries a stable `id` field from the start**, keyed on directly — explicit developer instruction during `/architect`, learned from feature 10's title-keying issue, so feature 13's real-data wiring won't repeat it.
- **`CalendarEvent.status` carried for schema fidelity**, unused/unrendered — same convention `Trend`/`Script` used before their real-data features.

## Problems solved

- **Event-item background token mix-up caught before review**: the design mock's `.event-item` uses `var(--bg)` (white, `--color-surface`), not `var(--bg2)` (`--color-surface-secondary`/page background) — initially wrote `bg-background` by mistake, caught by re-checking the mock's `:root` variable mapping and fixed to `bg-surface` before verification.
- **`rounded-md` vs. `rounded-lg` looked like inconsistency with `TrendCard`/`ScriptCard`** — verified against the design's raw CSS (`.event-item`/`.cal-day`/`.cal-nav button` all specify `var(--radius-md)`, while `.trend-card`/`.script-card` specify `var(--radius-lg)`) and confirmed it's the design's own intentional distinction between list-rows and grid-tiles, not drift. Documented in `ui-registry.md` so a future review doesn't re-flag it.
- **Playwright browser/module-resolution setup**: same pattern as prior sessions — `npx playwright install chromium` (already cached from feature 06/10), scripts copied into the `npx` cache dir (`~/AppData/Local/npm-cache/_npx/<hash>/`) before running so ESM `import "playwright"` resolves; running from an arbitrary cwd fails with `ERR_MODULE_NOT_FOUND`.
- **`curl http://localhost:3001/health` intermittently failed while the server was actually up** — resolved by using `127.0.0.1` instead of `localhost` (an IPv4/IPv6 resolution quirk in this shell, not a real server issue); confirmed via `netstat`/`Get-NetTCPConnection` that the port was genuinely listening.

## Current state

- **Feature 12 complete: built, imprinted, reviewed, 0 issues found, verified live at every stage.** Playwright confirmed the panel at all 3 responsive breakpoints against `glam-ai.html` with zero console/page errors, and confirmed the "+ Add event ↗" chip prefills chat and clears correctly on reload (same check pattern as Trends/Scripts). `tsc -b --noEmit` clean on `client/`.
- **Repo state:** branch `calendarPanel`, commit `98d176a` at HEAD, working tree clean — developer committed their own work, no commit made by me.
- Dev servers (server on 3001, client/Vite on 5173) were started for verification and explicitly stopped afterward; ports confirmed free at session end.
- One informational note carried into `progress-tracker.md` (not an issue): mock event dates are fixed to August 2026 to align with "today" at build time and will read as stale once real time passes into a different month — expected of static mock data, resolved when feature 13 wires in real Google Calendar reads.

## Next session starts with

**Feature 13 — Calendar Read**: `server/src/services/google-calendar.ts` (`listUpcomingEvents`), `calendar-agent.ts`'s `calendar_read` intent (real events → WhatsApp-friendly summary), `GET /api/calendar` feeding this same panel. Run `/architect` first per the project's loop — the panel built this session is the target UI, no rebuilding needed, just wiring real data in. Feature 13 will also need to decide how a real Google Calendar event maps to one of `EventItem`'s 4 dot colors, since the real `events` schema has no category/color field (flagged in this session's Decisions).

## Open questions

- How feature 13 will derive `EventItem`'s dot `color` from real Google Calendar data (no color/category field exists on the real event yet) — needs a decision during that feature's `/architect`.
- Whether `YOUTUBE_API_KEY` quota usage from repeated live verification runs is a concern — informational only, carried over from feature 11, still no action taken.
- `@langchain/google` still pre-1.0 (0.2.x) — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.

---

## PR Summary — Feature 12: Calendar Panel (Full UI, Mock)

**What this PR does:** Adds the Calendar dashboard panel — a month grid (today highlighted, event dots) plus a sorted event list, matching `context/designs/glam-ai.html`. Built against mock data only; no Google Calendar integration yet (that's feature 13). Replaces the `ComingSoonPanel` placeholder that was standing in for `/calendar`.

**Major changes:**
- New `CalendarEvent` mock data type and 4 sample events.
- New `CalendarGrid` component — real-date-driven month/today computation (not a hardcoded date), event-dot indicators, non-functional (visual-only) month navigation.
- New `EventItem` component — dot + title + derived date/time/location line, including "All day" formatting.
- `CalendarPage` rewritten to assemble the above plus an "Add event" chip that prefills the AI chat (does not write an event — matches the project's calendar-write-requires-approval rule, real add flow lands in feature 14).
- `ui-registry.md` updated with both new component patterns.

**Files changed (client/ and server/ only):**
- `client/src/lib/mock-events.ts` (new)
- `client/src/components/calendar/CalendarGrid.tsx` (new)
- `client/src/components/calendar/EventItem.tsx` (new)
- `client/src/pages/CalendarPage.tsx` (modified — replaced placeholder)

No `server/` files changed this feature.
