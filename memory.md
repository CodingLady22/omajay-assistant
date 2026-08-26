# Memory — Feature 22: Briefing Agent + Scheduled Send

Last updated: 2026-08-26

## What was built

Feature 22 shipped via the full loop: `/architect` → build → live verify (real run + explicit all-empty-context check) → `/review` (found 1 Important + 3 Minor + 2 Informational) → fixed the Important + 3 Minors → re-verified live → ticked in `progress-tracker.md`.

**Server — new:**
- `server/src/agents/briefing-agent.ts` — `gatherContext`/`describeContext`/`composeBriefing`/`buildFallbackBriefing`/`buildBriefing`. Pure (gather + compose only); not a LangGraph node, per `library-docs.md`'s existing rule that the briefing agent is scheduler-invoked only.
- `server/src/jobs/morning-briefing.ts` — `deliverBriefing(text)` (the pluggable delivery seam: logs + inserts `{ sent_at, content }` into `briefings`, since WhatsApp/feature 05 is still deferred) + `runMorningBriefing()`.
- `server/src/jobs/run-briefing-test.ts` — `npm run briefing:test`: real run against the live DB, the all-empty context checked explicitly via both the LLM path and the deterministic fallback, all-day date-key assertions across timezones, cron-derivation assertions (valid/missing/malformed `briefing_time`).

**Server — modified:**
- `server/src/jobs/scheduler.ts` — `briefingCronFromTime()` (parses `profile.briefing_time` "HH:MM" → cron, falls back to `"0 8 * * *"` on anything missing/malformed), `loadSchedulingProfile()` (replaces `resolveTimezone()`, fetches the profile once for both jobs instead of twice), both the trends scan and the briefing registered in order.
- `server/src/agents/calendar-agent.ts` — `/review` fix: `isEventAllDay`/`getEventDateKey`/`todayDateKey` extracted and exported (shared with `briefing-agent.ts`); `formatEventLine`/`buildEventsSummary`/`calendarAgent` now take/pass `profile.timezone` explicitly instead of relying on the server host's default.
- `server/package.json` — `briefing:test` script added.

**Client:** no changes this feature — `build-plan.md`'s feature 22 entry has no UI section, and none was added.

**Docs updated:** `context/build-plan.md` (new feature 23 "Mark Script Posted / Contract Sent" inserted right after 22; Settings 23→24, Empty States 24→25; Feature Count table updated to 25 total), `context/progress-tracker.md` (feature 22 ticked, full Decisions/Notes recorded, feature 23 added to the checklist, 3 stale "feature 23/24" cross-references fixed), `context/ui-registry.md` (2 stale cross-references fixed).

## Decisions made

- **"Unfinished" scope capped to the last 14 days**, not all drafts regardless of age. No route anywhere ever flips a script's `status` to `"posted"` or a contract's to `"sent"` — an uncapped query would resurface every draft forever. 14 days (not 7) was chosen deliberately: a short cap drops exactly the highest-value reminders (something forgotten 10+ days ago).
- **New feature 23 inserted immediately after 22** to close that gap for real (one status-flip route + one UI action each) — the 14-day cap is an explicit, temporary approximation, not a fix. Same insertion/renumbering pattern the project already used for feature 21.
- **`getProfile()` was confirmed already moved** into `db/profile.ts` back in feature 11 — `build-plan.md`'s feature-22 note (written when feature 09 deferred the move) was stale, not the codebase. Verified before assuming the note was current.
- **Delivery seam lives at the job layer, not in the agent.** `briefing-agent.ts` stays pure; `jobs/morning-briefing.ts` owns `deliverBriefing`. This is the first job in the codebase to write to Mongo directly rather than through an agent-exported function — disclosed during `/review`, confirmed intentional, kept as-is.
- **Composition is a real LLM call (temperature 0.3, the shared default)**, not deterministic templating like `calendar-agent.ts`'s `buildEventsSummary` — falls back to a deterministic template (`buildFallbackBriefing`) on any composition failure.

## Problems solved

- **Important timezone bug (found in `/review`), fixed together with its twin in feature 13's `calendar-agent.ts` per explicit instruction not to fix one and leave the other.** All-day Google Calendar events are normalized to a timezone-naive `"T00:00:00"`/`"T23:59:00"` string with no real zone attached. Constructing a `Date` from that naive string let the server host's own local timezone leak into date comparisons/labels that should only ever depend on `profile.timezone` — on a UTC host with Sofia in Europe/Rome, an all-day event could resolve to the wrong day. Fixed by reading an all-day event's date directly from the string (never through `new Date()` + ambient-zone interpretation) in the new shared `isEventAllDay`/`getEventDateKey`/`todayDateKey` helpers.
- **Verified genuinely host-independent**, not just re-tested under the same default twice: ran the all-day date-key check under `process.env.TZ` = `UTC`, `Pacific/Kiritimati` (UTC+14), and `Etc/GMT+12` (UTC-12) — a 26-hour spread — all three produced the identical, correct `"2026-08-25"`.
- **Dev-environment gotcha discovered along the way: Git Bash/MSYS on this Windows machine silently drops any `TZ` env value containing a `/`** (its path-conversion heuristic mistakes an IANA zone name like `Pacific/Kiritimati` for a filesystem path). `TZ=UTC` works fine via Bash (no slash); a real non-UTC zone needs PowerShell's `$env:TZ = "..."` instead. Cost real verification time — two `TZ=Pacific/Kiritimati npm run briefing:test` Bash runs silently no-op'd on this before being caught (the log line `process TZ=(host default)` was the tell).
- **3 Minor `/review` findings also fixed:** the 3-way duplicated `isAllDay` (now one shared implementation in `calendar-agent.ts`), a missing why-comment on the `en-CA` locale trick, and an untested cron-fallback path (now exercised directly in `briefing:test` via exported `briefingCronFromTime`/`DEFAULT_BRIEFING_CRON`).
- **2 Informational findings** (the job-level direct `briefings` write, the small `registerJobs` refactor) were disclosed, confirmed as intentional by the developer, and left as-is — not defects.

## Current state

- **Feature 22 complete, reviewed (all actionable findings fixed and re-verified live), ticked in `progress-tracker.md`.** `tsc -b --noEmit` clean on `server/` throughout.
- Verified live end-to-end against the real stack: a real briefing run gathered actual leftover script/contract drafts from prior features' testing and composed a natural reminder, then delivered it (logged + a real row inserted into `briefings`); the all-empty context read naturally via both the LLM path and the deterministic fallback; a real `npm run dev` boot confirmed both cron jobs register correctly and in the required order (6am trends scan before 8am briefing, both reading the real seeded profile's `Europe/Rome` timezone).
- Repo state: the developer said they committed the initial build themselves mid-session; my subsequent `/review`-fix changes (the timezone fix across `briefing-agent.ts`/`calendar-agent.ts`/`run-briefing-test.ts`/`scheduler.ts`) plus all doc updates were made after that and have **not** been committed by me — per standing instruction to only commit when asked.
- No dev servers left running; the `tmp-tz-check.ts` scratch file used for the PowerShell timezone verification was deleted after use.

## Next session starts with

**Feature 23 — Mark Script Posted / Contract Sent** (new, inserted this session), per `build-plan.md`: `POST /api/scripts/:id/status` (flips `"draft"` → `"posted"`) and `POST /api/contracts/:id/status` (flips `"draft"` → `"sent"`), plus a small `<Chip>`-style action on `ScriptCard`/`ContractCard` to trigger each. Marking an item doesn't remove it from its library view — only from the briefing's 14-day-capped "unfinished" query. Run `/architect` first per the project's loop.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, no action needed yet.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern should become a deliberate app-wide decision — carried over from feature 19, still undecided.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component — carried over from feature 20, still open.
- The `<select>` in `UploadDocumentForm` deviates slightly from `ui-tokens.md`'s Input spec — carried over from feature 21, not corrected in isolation.
- New: the Git Bash/MSYS "TZ with a slash gets silently dropped" quirk on this dev machine isn't a code issue, just something to remember — use PowerShell's `$env:TZ` for any future non-UTC timezone testing here.
