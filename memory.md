# Memory — Feature 09: Daily Trends Scan (Scheduled)

Last updated: 2026-08-11

## What was built

**Feature 09, built, reviewed (two passes), fixed, verified.** Branch `dailyScan`, off `main` (post-feature-08 merge, PR #8). Repo has the same auto-commit pattern seen in feature 08's session: commit `d91f6b7` ("feat: add scanner for daily trends") captured the first-pass diff; the `/review` Layer 3 fix (`scheduler.ts`'s `resolveTimezone()`) plus doc updates sit as uncommitted changes on top. The developer said they'll commit this themselves.

- `server/src/jobs/daily-trends.ts` — new. `runDailyTrendsScan()`: fetches profile, derives topic (`profile?.niche ?? DEFAULT_TOPIC`), calls `scanAndStoreTrends()` inside its own try/catch (never throws), logs success/failure.
- `server/src/jobs/scheduler.ts` — new. `registerJobs()`: resolves the cron timezone via `resolveTimezone()` (wraps `getProfile()` in try/catch, falls back to `"UTC"` on either a missing profile or a thrown error — the post-review fix), registers `SCAN_CRON = "0 6 * * *"` (named constant, with a comment on the feature-21 timing dependency and the future `profile.scan_time` idea) via `node-cron`.
- `server/src/jobs/run-daily-trends-test.ts` — new. `npm run jobs:test`: connects to Mongo, runs the scan once, closes the connection — matches the `graph:test`/`trends:test` pattern.
- `server/src/agents/trends-agent.ts` — `getProfile()` and `DEFAULT_TOPIC` changed from private to exported, so the job can reuse them instead of duplicating profile-fetch/fallback logic.
- `server/src/index.ts` — `registerJobs()` wired into `bootstrap()`, after DB connect + index setup, before `app.listen`.
- `server/package.json` — added `node-cron` (dependencies) + `@types/node-cron` (devDependencies, matching the `@types/express` pattern); added `jobs:test` script.
- `context/code-standards.md` — `node-cron` marked as added (feature 09) in the approved dependency list.
- `context/progress-tracker.md` — feature 09 ticked, phase advanced to 4 (Content), 7 new Decisions entries (topic fallback, timezone source, `SCAN_CRON` constant, the 6am-before-8am timing dependency, the try/catch fix, the deferred `getProfile()` relocation plan, node-cron dependency), 2 new Notes entries (what was built + live verification).
- `context/build-plan.md` — feature 21's entry now carries a note to move `getProfile()` out of `trends-agent.ts` into a shared accessor when the briefing agent becomes its third consumer.

## Decisions made

- **Scheduled scan topic = `profile?.niche ?? DEFAULT_TOPIC`** — no chat message exists for a cron-triggered scan, so it reuses `trendsAgent()`'s existing generic-ask fallback rather than inventing new logic.
- **Cron timezone = `profile.timezone`, read once at server boot inside `registerJobs()`**, wrapped in `resolveTimezone()` which falls back to `"UTC"` on *any* failure (missing profile OR a thrown DB error) — this was the `/review` fix, see Problems solved.
- **`SCAN_CRON` is a named constant in `scheduler.ts`, not inline** — tunable in one place; a future `profile.scan_time` field could formalize it later, same pattern as `profile.briefing_time`.
- **Timing dependency recorded, not enforced in code:** the 6 AM scan must run before the 8 AM morning briefing (feature 21) so the briefing reads fresh trends. Documented at `SCAN_CRON`'s definition and in `progress-tracker.md` so the two times stay coordinated if either changes.
- **`getProfile()` stays in `trends-agent.ts` for now** — only two consumers (itself + `scheduler.ts`), moving it would be refactoring ahead of need. Plan to relocate to a shared accessor (e.g. `db/profile.ts`) is recorded for when feature 21 adds a third consumer.

## Problems solved

- **`/review` Layer 3 finding (fixed):** `registerJobs()` originally called `getProfile()` unguarded — a thrown error (not just a missing profile) would propagate through `bootstrap()` to `index.ts`'s top-level catch and `process.exit(1)`, crashing the *entire server* over a timezone lookup. Fixed by extracting `resolveTimezone()` with its own try/catch, falling back to `"UTC"` on any failure. Re-verified live: normal boot still resolves the real `Europe/Rome` from the seeded profile.
- **`/review` Layer 2 finding (deferred, plan recorded):** `getProfile()` lives in a trends-named file but is generic profile-fetch logic; `scheduler.ts` reaching into `trends-agent.ts` for it is a minor coupling smell. Not fixed now (two consumers only) — plan recorded in `progress-tracker.md` and `build-plan.md`'s feature 21 entry.
- **`npm run dev` background verification twice got stuck with no boot logs** — root cause both times was a *previous* backgrounded dev-server process not being fully killed by `TaskStop` (tsx watch's child `node.exe` survived), leaving port 3001 occupied so the new instance hung silently. Fixed each time by `netstat -ano | grep :3001` to find the PID, then `Stop-Process -Id <pid> -Force` via PowerShell. Worth remembering: always verify the port is actually free after `TaskStop` on a `tsx watch` process, don't assume it worked.
- **Auto-commit reappeared** (same VS Code-extension checkpointing behavior noted in feature 08's session) — `d91f6b7` captured the pre-review-fix state. Not concerning, same as last time; developer is committing manually this session so no action needed from me.

## Current state

- **Feature 09 complete, reviewed (2 passes), fixed, verified.** `tsc -b --noEmit` clean on `server/`. Verified live against the real stack: `npm run jobs:test` stored 10 freshly-scored trends using the seeded profile's niche as the topic; full `npm run dev` boot (post-fix) logged `jobs/scheduler Daily trends scan registered — 0 6 * * * (Europe/Rome)` and served `/health` normally.
- **Repo state:** branch `dailyScan`, commit `d91f6b7` at HEAD (auto-commit, pre-review-fix), plus uncommitted changes on top: `context/build-plan.md`, `context/progress-tracker.md`, `server/src/jobs/scheduler.ts` (the `resolveTimezone()` fix). Full feature-09 `server/src/` diff from branch point (`2f7941c`) to current working tree: `server/src/agents/trends-agent.ts`, `server/src/index.ts`, `server/src/jobs/daily-trends.ts`, `server/src/jobs/run-daily-trends-test.ts`, `server/src/jobs/scheduler.ts` — 5 files, +63/-2. **Developer is committing this themselves** — no commit was made by me.
- Background dev-server processes were spun up twice this session for boot verification and explicitly stopped + force-killed afterward; port 3001 confirmed free at end of session.

## Next session starts with

Confirm the commit is in and the repo is clean, then proceed to **Feature 10 — Scripts Panel — Full UI (Mock)**: scripts library UI matching the design (draft cards with kind badge, structured body, action chips), mock Reel script + caption cards, no backend yet. Run `/architect` first per the project's loop.

## Open questions

- Whether the recurring VS Code-extension auto-commit behavior is expected/desired — flagged twice now (features 08 and 09), still no developer decision recorded on whether to look into/disable it.
- Whether `YOUTUBE_API_KEY` quota usage from repeated live verification runs (feature 08 + feature 09 sessions) is a concern — informational only, no action taken.
- `@langchain/google` still pre-1.0 — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
