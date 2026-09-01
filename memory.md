# Memory — Feature 25: Empty States + Error Handling Pass

Last updated: 2026-09-01

## What was built

**Feature 25, built end to end and shipped — but as an audit-and-fix pass, not new panels.** `/architect` surfaced (before any code was written) that build-plan.md's original scope was already mostly done: every panel (Trends/Scripts/Calendar/Contracts) already had both an empty-state message and a CTA chip from its own originating feature. The developer explicitly sorted the six candidate open-question items into three in-scope, two deferred, one trivial-not-forced — see Decisions below. Real changes made:

1. `client/src/components/documents/UploadDocumentForm.tsx` — `<select>` reconciled to `ui-tokens.md`'s documented Input spec (`px-3 py-2 focus:border-pink-mid`, was `px-2 py-1.5` with no focus state).
2. `client/src/pages/CalendarPage.tsx` — empty-state wrapper got `justify-center` added, matching `ContractsPage`'s identical "nested empty state" family exactly (Trends/Scripts are a separate "whole-page early-return" family and already matched each other).
3. `context/ui-rules.md` — new "Disabled Controls" section formalizing bare-disabled/no-tooltip as the app-wide rule (matching the existing `CalendarGrid` precedent).
4. `server/src/services/google-calendar.ts` — **real bug fix**, found only by force-triggering a failure live, not by reading: `listUpcomingEvents()` was catching every failure (including auth errors) and degrading to `[]`. Removed the try/catch entirely (matching the same file's existing `createEvent()` precedent/reasoning). See Problems Solved.
5. `context/ui-registry.md` / `context/progress-tracker.md` — imprint update + feature ticked off with full decisions recorded.

No server routes, agents, or types changed. No new dependencies.

## Decisions made

- **The developer explicitly triaged six candidate follow-up items (from the prior session's open questions) into three buckets before this feature's scope was locked**: in-scope (Atlas index-missing → verify only; `UploadDocumentForm` select → fix; disabled-control tooltip → make the app-wide call now), deliberately deferred (real Google Calendar swap → production cutover; `@langchain/google` pre-1.0 → a watch note, not a task), and trivial-not-forced (`ContractCard`'s download-link className → extract on the third link-chip occurrence, per the existing rule — still open, unchanged).
- **Empty-state CTA chips needed no new code** — an `/architect`-stage code read found they already existed everywhere a next step makes sense (Trends: "✨ What's trending?", Scripts: "+ Generate new idea ↗", Calendar: "+ Add event ↗", Contracts: "✨ Draft a contract"). Documents' nested list stays chip-less on purpose — the upload form directly above it is the CTA.
- **Atlas index-missing handling verified, not touched** — `rag/retrieve.ts`'s `ok|empty|index_missing` split and both `contractsAgent()`/`POST /api/contracts/draft`'s distinct friendly messages were already correct (built in feature 20). Explicit developer call: verify-only, no proactive Settings indicator added.
- **Disabled-control convention locked as bare-disabled, no tooltip** — matches the one existing precedent (`CalendarGrid`'s chevrons) and every other disabled state in the app; no retrofits needed.
- **`listUpcomingEvents()` now throws instead of degrading to `[]`** — a deliberate, disclosed divergence from `code-standards.md`'s general "services degrade gracefully" rule, justified the same way `createEvent()` in the same file already is: a swallowed failure here is indistinguishable from "genuinely nothing on the calendar," which is a materially worse outcome than a services call degrading a *content-discovery* feature (trends) to "nothing found."
- **Empty-state markup normalized within two existing "families," not forced into one shared class string** — Trends/Scripts (whole-page replacement) vs. Calendar/Contracts (nested alongside other always-visible content) serve genuinely different layouts; forcing identical markup would fight one of them.

## Problems solved

- **Real bug, found by force-triggering rather than reading, per explicit developer instruction not to let "spot-check" reduce to grepping for `try/catch`.** Two throwaway verification scripts (written, run, deleted — never committed) forced the two hardest-to-reach failure paths live:
  - Voyage AI embedding auth failure mid-contract-draft: already correct. `contractsAgent()` answered "Couldn't draft that contract right now — try again in a moment." — no fix needed.
  - Google Calendar auth failure mid-read: **broken**. With a corrupted service-account credential, `calendarAgent()`'s `calendar_read` path answered *"You don't have anything on your calendar for the next two weeks"* — a false claim about her real schedule, not a friendly degradation, even though the correct message already existed in `calendarAgent()`'s own catch block and was simply unreachable (the error was swallowed one layer down in `listUpcomingEvents()`).
  - Fixed by removing `listUpcomingEvents()`'s try/catch. Re-verified live across all three real callers: `calendarAgent()`'s chat path now correctly says "Couldn't reach your calendar right now"; `routes/calendar.ts`'s `GET /` (via `getCalendarView()`) now rejects into its existing generic-500 catch instead of silently returning `200` with an empty list; `briefing-agent.ts`'s `gatherTodayEvents()` still degrades gracefully to just an empty calendar section (it already independently wraps this call), confirmed via a full `buildBriefing()` run under the same forced failure.
- **Checked trends' equivalent failure mode and found it does NOT need the same fix** — if YouTube fails while Instagram/TikTok stay `[]` stubs, `scanAndStoreTrends()` falls back to stale-but-real stored data, or an honest "couldn't find any trending content" only when nothing has ever been scanned. Not a false claim the way the calendar bug was.
- **Three safety gates re-confirmed by reading actual call sites, not re-asserted from memory**: `createEvent()` has exactly one caller in the whole codebase (reachable only via the explicit confirm route); `dms-agent.ts` is still the harmless feature-03 stub with zero send capability; no `sendWhatsApp`-equivalent exists anywhere yet — the only delivery path anywhere is the morning-briefing job's own `deliverBriefing()`.

## Current state

- Feature 25 fully built, live-verified, `tsc -b --noEmit` clean on both `server/` and `client/`, zero console/page errors across a full Playwright pass of all 6 dashboard routes (real existing data — Velour Cosmetics contract, real scripts/events/documents — not mocked). Ticked in `progress-tracker.md` with full decisions recorded; `ui-registry.md` imprinted.
- **Not yet committed** — working tree has 6 modified files (see the PR summary below), nothing staged. Developer has not yet said how to split the commits (bug fix vs. doc/UI consistency changes).
- No dev servers left running; scratch verification scripts and the scratch Playwright directory were cleaned up (one `/c/tmp/pw-feature25` directory may still be lingering due to the same Windows file-lock quirk noted in the prior session's memory — harmless, outside the repo).

## Next session starts with

**Nothing is queued to build next automatically** — Phase 9 is now fully complete (24 and 25 both done). The plan's next numbered item is **Feature 26 — Single-user Auth** (Phase 10), but per the developer's own standing instruction (carried over from the prior session), don't start it without re-confirming the plan is still accurate first — re-read `build-plan.md`'s feature 26 entry and re-`/architect` rather than assuming the env-var/cookie approach agreed on 2026-08-30 is still exactly right.

Before that: the developer may want to decide how to commit this session's 6 changed files (ask, don't assume) — the calendar bug fix is arguably worth its own commit separate from the UI-consistency/doc changes, mirroring how feature 24's session split its own out-of-scope fix into a separate commit.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20, still unaddressed (feature 25 confirmed the *reactive* per-draft detection is correct; proactive detection was explicitly decided against for this feature).
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, explicitly a watch-only note, no action.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, explicitly deferred to the production cutover.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component — carried over, explicitly deferred until a third link-chip occurrence appears (per the existing extraction-threshold rule).
- Feature 22's briefing 14-day recency cap could eventually be replaced with a real `status`-based filter — carried over from feature 23, still a future polish candidate, untouched this session.
