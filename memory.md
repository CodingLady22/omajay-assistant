# Memory — Feature 24: Settings Panel (+ Auth planning, + a small separate fix)

Last updated: 2026-08-31

## What was built

**1. Single-user Auth planning (docs only, nothing built yet).** Developer flagged a real gap: `architecture.md` always anticipated "the dashboard protected by a single login," but no feature ever built it — every `/api/*` route has been unauthenticated the whole build. Discussed and approved an approach via an `/architect`-style conversation (not the skill itself, deliberately deferred): app-level password (`DASHBOARD_PASSWORD` env var, `crypto.timingSafeEqual`) + signed httpOnly session cookie (`SESSION_SECRET`, Node's built-in `crypto`, no new dependency, no session store) over edge/hosting-level protection (untestable until a host is chosen, needs a WhatsApp-webhook carve-out) and over HTTP Basic Auth (worse UX for a daily-use dashboard). Added as new **feature 26 "Single-user Auth"** in a new **Phase 10 — Auth + Deploy Readiness**, placed last (after Settings/Empty States), before real accounts/documents connect. `GET /api/contracts/:id/pdf` was flagged as the one other private-data-by-URL leak the same gate will need to cover. Written up in `build-plan.md` and `progress-tracker.md` — **not built**, do not `/architect` or implement until the plan actually reaches it.

**2. Feature 24 — Settings Panel, built end to end and shipped.** Real `/settings` page (replacing `ComingSoonPanel`): an editable WhatsApp-briefing card (send time + 4 reminder toggles) and a read-only connected-accounts card (WhatsApp/Instagram/YouTube/Google Calendar). Full file list is in the last PR summary given to the developer (server: `agents/briefing-agent.ts`, `db/profile.ts`, `jobs/scheduler.ts`, `jobs/run-briefing-test.ts`, `lib/env.ts`, `routes/settings.ts` [new], `types/index.ts`, `index.ts`; client: `lib/api.ts`, `lib/types.ts`, `pages/SettingsPage.tsx`). Ticked off in `progress-tracker.md` with full decisions recorded; `ui-registry.md` imprinted.

**3. Separate, out-of-scope fix.** `client/src/pages/ContractsPage.tsx`'s `refetchDocuments` had the identical `react-hooks/set-state-in-effect` violation this feature's first draft also hit (redundant synchronous `setState("loading")` before an async fetch). Fixed with the same one-line removal, committed on its own (`48a2f4b`) at the developer's explicit request, kept out of feature 24's commits.

## Decisions made

- **"Reminders" map to the four real briefing content categories** (events/scripts/contracts/DMs — what `briefing-agent.ts` already gathers), not the design mock's three fictional real-time alert channels ("trending alerts," "DM alerts"), which don't exist as separate notification mechanisms — only the one daily briefing is autonomous outbound (`architecture.md`'s hard safety rule). Confirmed during `/architect` before any code was written.
- **A disabled reminder is never gathered, not gathered-then-hidden** — `gatherContext()` skips the DB call entirely for a disabled category, and both `describeContext` (LLM path) and `buildFallbackBriefing` (deterministic path) omit that category's section rather than showing it empty. Proven with new deterministic assertions in `run-briefing-test.ts`, not just live-eyeballed.
- **Missing/legacy `profile.reminders` defaults every category to `true`** (`withReminderDefaults`) — the real seeded profile (predates this field) behaves identically before/after.
- **Connected-accounts status is env-var presence only**, not a live API call — new `isXConfigured()` helpers in `lib/env.ts` reuse each integration's existing zod schema (pulled into named consts specifically so both the lazy getter and the presence check share one source of truth).
- **Briefing-time changes reschedule the live `node-cron` task immediately**, not just on next restart — discovered mid-build (not in the original `/architect` plan) that `registerJobs()` only ever read `profile.briefing_time` once at boot. Added `scheduleBriefing`/`rescheduleBriefing` in `jobs/scheduler.ts`, holding the live `ScheduledTask` in module state so a settings save can `.destroy()` and replace it.
- **`routes/settings.ts` calling `jobs/scheduler.ts` directly** is a disclosed, narrow extension of the normal routes→agent/db boundary (same precedent as feature 08's `routes/trends.ts` → `agents/trends-agent.ts`) — there's no other seam to swap a live cron task.
- **No new toggle-switch component** — reminder rows are clickable status rows reusing the existing "On = `text-success`" token, matching the mock's `wa-row` visual language exactly, rather than inventing a switch/checkbox pattern (none exists in `ui-tokens.md` yet).

## Problems solved

- **`/review` caught 2 real issues, both fixed before shipping**: (1) `routes/settings.ts`'s `getConnections()`/`toSettingsPayload()` were missing explicit return types — added `ConnectionStatus`/`SettingsPayload` to `server/src/types/index.ts`. (2) `SettingsPage.tsx`'s first draft violated `react-hooks/set-state-in-effect` (synchronous `setState("loading")` before the async fetch in the mount effect) — fixed by dropping the call, since the initial `useState("loading")` value already covers first render. A full (not scoped) `eslint` run then surfaced the *identical* bug already living in `ContractsPage.tsx:63`, unrelated to this feature — fixed separately per explicit instruction (see "What was built" #3).
- **Dev-environment gotcha (not a code bug), cost real time this session**: starting a background dev server via plain `npm run dev > file.log 2>&1 &` in the Bash tool does not reliably keep capturing output — the process itself kept running (confirmed via `netstat`/`curl`) but its log file stopped updating after the launching shell command returned, and `pkill -f`/SIGTERM did nothing on this Windows/Git-Bash setup (no real POSIX signals). Fix: use the Bash tool's own `run_in_background: true` for dev servers (properly tracked output file), and kill by discovering the real Windows PID via `netstat -ano | grep :PORT` + `taskkill //F //PID`, never `pkill`.
- Confirmed live (not assumed) that the live-reschedule fix actually works: three consecutive `POST /api/settings` calls with different times produced three distinct "Morning briefing registered — ..." log lines with the correct cron pattern each time, no restart involved.

## Current state

- Feature 24 fully built, reviewed, fixed, live-verified (server `curl` round trips against real Mongo/Atlas, full Playwright pass at 3 breakpoints, `briefing:test` incl. 2 new assertions, `tsc -b --noEmit` clean both sides), ticked in `progress-tracker.md`, imprinted in `ui-registry.md`. All real profile fields touched during testing were restored to their original values.
- Committed in 3 separate commits: `56050e9` (feature code, committed by the developer), `67e9ee5` (progress-tracker tick + decisions), `48a2f4b` (the separate ContractsPage.tsx fix). Working tree is clean.
- Feature 26 (Single-user Auth) exists only as a written plan in `build-plan.md`/`progress-tracker.md` — zero code.
- No dev servers left running; scratch Playwright test files/dirs cleaned up (one `/c/tmp/pw-settings` directory may still be lingering due to a Windows file-lock quirk — harmless, outside the repo, safe to delete manually or ignore).

## Next session starts with

**Feature 25 — Empty States + Error Handling Pass**, per `build-plan.md`: every panel needs an empty state, every agent should degrade gracefully on a failed third-party call, and all three safety gates (DM send approval, calendar add approval, briefing-only autonomy) need a final confirmation pass. Run `/architect` first per the project's loop.

Feature 26 (Single-user Auth) is queued after Phase 9 finishes — don't jump to it early, and don't start it without re-confirming the plan is still accurate (env vars, cookie approach) since some time may have passed.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, no action needed yet.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern should become a deliberate app-wide decision — carried over from feature 19, still undecided.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component — carried over from feature 20, still open.
- The `<select>` in `UploadDocumentForm` deviates slightly from `ui-tokens.md`'s Input spec — carried over from feature 21; `SettingsPage`'s new `<input type="time">` follows the documented spec exactly, so this is now the one remaining inconsistency worth reconciling in a future pass.
- Feature 22's briefing 14-day recency cap could eventually be replaced with a real `status`-based filter — carried over from feature 23, still a future polish candidate.
