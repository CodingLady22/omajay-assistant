# Memory — Feature 10: Scripts Panel — Full UI (Mock)

Last updated: 2026-08-12

## What was built

**Feature 10, built, imprinted, reviewed (four `/code-review` passes total, three rounds of fixes), verified live.** Branch `scriptsPanel`, off `main` (post-feature-09 merge, PR #9). One commit on the branch so far (`3721a2d`, developer's own commit, capturing the initial build); this session's three fix rounds are uncommitted on top — **developer commits their own work in this project**, no commits made by me.

- `client/src/lib/mock-scripts.ts` — new. `ScriptStatus` type; `ScriptBase`/`ReelScript`/`CaptionScript`/`CarouselScript` discriminated union (`Script = ReelScript | CaptionScript | CarouselScript`, keyed on `kind`); `MOCK_SCRIPTS` — 2 entries (a Reel draft with hook/body/cta, a Lumière brand caption) matching `context/designs/glam-ai.html`'s scripts section 1:1, each with a stable `id`, a bespoke `actionLabel`/`actionPrompt` pair, and a `status` field carried for schema fidelity (commented as not-yet-rendered).
- `client/src/components/scripts/ScriptCard.tsx` — new. Renders title + a neutral kind badge (`bg-info-bg text-info` — deliberately not the DM pink/green pair), a `renderBody()` switch (typed `ReactElement | null`) branching on `kind` with an explicit `"carousel"` placeholder case and a `never`-typed exhaustiveness `default` that logs and returns `null` (not the raw object) on an unrecognized kind, and a per-item action chip that navigates to `/` with a prefilled chat prompt. Not a whole-card button — deliberate divergence from `TrendCard`'s pattern, matches the design mock exactly.
- `client/src/pages/ScriptsPage.tsx` — rewritten, replacing `ComingSoonPanel`. Maps `MOCK_SCRIPTS` to `ScriptCard`s, keyed on `script.id`, plus a page-level "+ Generate new idea ↗" chip.
- `context/ui-registry.md` — new `ScriptCard` entry (`/imprint`), documenting the neutral kind-badge decision and the not-a-button divergence so neither gets re-flagged as drift later.
- `context/build-plan.md` — feature 11 entry now carries two notes: (1) consolidate `Script` into `client/src/lib/types.ts` and delete the mock file when real data lands (same pattern as feature 08's `Trend`), (2) extract the chip-button className and the `navigate("/", { state: { prompt } })` pattern (each now duplicated 4× across Trends/Scripts) into a shared `<Chip>` component and a `useChatPrompt()`-style helper, deliberately deferred here rather than fixed now to avoid touching these files twice.
- `context/progress-tracker.md` — feature 10 ticked, "Next" advanced to feature 11, full Decisions + Notes trail of the `/architect` session and all three `/code-review` fix rounds.
- `memory.md` — this file, overwritten per developer confirmation (previous content: feature 09 summary).

## Decisions made

- **`Script` is a discriminated union**, not one loose object — TypeScript enforces a caption can't read `hook`/`cta`. `CarouselScript` is included for schema completeness (no design mock exists for it yet) — an explicit `/architect`-confirmed assumption, not an oversight.
- **Kind badge does not reuse the DM pink/green pair**, even though the mock's raw HTML happens to reuse those exact CSS classes — judged a coincidence of the static mock, not shared meaning. Uses `bg-info-bg text-info` instead, same pill shape as `TrendCard`'s platform badge.
- **`ScriptCard` is not a whole-card button** — matches the design exactly (only inner chips are click targets), a documented divergence from `TrendCard`'s canonical clickable-card pattern.
- **Per-item `actionLabel`/`actionPrompt` fields** (not derived from `kind`) — mirrors `TrendCard`'s per-item `prompt`.
- **`status` field kept but not rendered** — schema-fidelity only (same reasoning as `Trend` carrying its full server shape); the mock's "· Draft" is literal title text, not a status badge.
- **Chip-button and navigate-with-prompt duplication (now 4× each across Trends/Scripts) deliberately deferred to feature 11**, not extracted now — feature 11 already touches these files for real-data wiring, so extracting there avoids churning them twice. Recorded in `build-plan.md`.

## Problems solved

- **`/code-review` round 1: unstable React key.** `ScriptsPage.tsx` keyed the list on `script.title` (non-unique, free-text) — would collide once feature 11 generates scripts dynamically. Added `id: string` to `ScriptBase`, keyed on `script.id`. Matches feature 06's *original* mock precedent exactly (`key={trend.id}`, confirmed via `git show` on that commit), not just the later `external_id` convention.
- **`/code-review` round 2: `CarouselScript` silently fell through to the caption renderer.** Two mock kinds (`caption`, `carousel`) both had a `.text` field, so the original ternary rendered them identically with no signal that carousel had no real layout decision yet. Replaced with an explicit `renderBody()` switch: a distinct `"carousel"` placeholder case, plus a `never`-typed exhaustiveness `default` so a future union member without a matching case fails to compile. Also removed the now-unused `ScriptKind` export (zero consumers repo-wide).
- **`/code-review` round 3 (8-angle pass, verifying round 2): the exhaustiveness `default` case was itself a latent crash risk.** `return exhaustiveCheck` returned the raw `script` object as a JSX child — `never`-narrowing is compile-time only, so real (feature 11+) data with an unrecognized `kind` would have thrown React's "Objects are not valid as a React child" and crashed the card, a regression from the old ternary's silent-empty degradation. Fixed: `console.error` + `return null`, keeping the compile-time guard without the runtime crash. Also fixed: `renderBody` was missing its explicit return type (`code-standards.md` rule, and this file's sibling `ChatPanel.tsx` helpers already follow it) — typed `ReactElement | null`, imported from `"react"` (confirmed via `tsc` that this project's TS setup has no global `JSX` namespace — `JSX.Element` fails to compile here). Also added a comment on `CarouselScript.text` noting it's dead until real carousel rendering lands, matching the comment style already used for `status`.
- **False leads investigated and ruled out, not fixed:** the "no empty-state branch in `ScriptsPage`" concern (raised independently by 2 of 6 angles in round 2's review) matches feature 06's original mock-only `TrendsPage` shape exactly (`git show` on its first commit confirmed the empty check was only added in feature 08 alongside real fetching) — not new drift.
- **`vite` dev-server backgrounding**: wrapping `npm run dev &` inside a `sleep; cat log` compound command gets killed the moment that compound command's own foreground process exits (the background task tracker considers it "completed" and reaps children) — port never actually stays open. Fix: run `npm run dev` as its own top-level backgrounded Bash call with nothing else in the command, so the harness tracks the long-running process directly. Playwright verification scripts also need to be copied into an npx-cache directory that already has `node_modules/playwright` (ESM `import "playwright"` resolves relative to the importing file's location, not `cwd` or `NODE_PATH`) — reused `C:\Users\Utente\AppData\Local\npm-cache\_npx\361ceb562f3b3235` again this session, chromium already installed there from a prior session.

## Current state

- **Feature 10 complete: built, imprinted, reviewed 4×, fixed 3×, verified live at every stage.** `tsc -b --noEmit` clean on `client/`. Final Playwright pass confirmed zero console/page errors at all 3 responsive breakpoints and all 3 interactive chips (both per-card action chips + the page-level "+ Generate new idea" chip) correctly prefill the chat and clear on reload.
- **Repo state:** branch `scriptsPanel`, commit `3721a2d` at HEAD (developer's own commit, initial build), plus uncommitted changes on top: `client/src/components/scripts/ScriptCard.tsx`, `client/src/lib/mock-scripts.ts`, `client/src/pages/ScriptsPage.tsx` (all three fix rounds), `context/build-plan.md`, `context/progress-tracker.md`. `context/ui-registry.md` changes are already in the `3721a2d` commit. **Developer is committing this themselves** — no commit made by me this session either.
- Background dev-server processes were spun up 3 times this session (once per fix-verification round) and explicitly stopped + force-killed after each; port 5173 confirmed free at session end.
- A PR summary (major changes + a src-folder-only file list) was requested and produced this session — see the conversation for the exact text, not duplicated here.

## Next session starts with

Confirm the commit is in and the repo is clean, then proceed to **Feature 11 — Content Agent + Save**: `server/agents/content-agent.ts` (LLM temp 0.7, structured Reel script + caption variations + hashtags), save to `scripts`, `GET/POST /api/scripts`, wire the dashboard library to real data — plus the two build-plan-recorded chores (consolidate `Script` into `client/src/lib/types.ts` deleting the mock file, and extract the chip/navigate-prompt duplication into shared components). Run `/architect` first per the project's loop.

## Open questions

- Whether `YOUTUBE_API_KEY` quota usage from repeated live verification runs (feature 08 + feature 09 sessions) is a concern — informational only, no action taken.
- `@langchain/google` still pre-1.0 — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
