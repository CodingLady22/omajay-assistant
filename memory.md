# Memory — Feature 11: Content Agent + Save

Last updated: 2026-08-14

## What was built

**Feature 11, built via `/architect` → build → `/imprint` → `/review` (1 pass, 3 findings, all fixed and re-verified live).** Branch `contentAgent`, off `main` (post-feature-10 merge, PR #10). Developer committed the initial build as `47164f7` ("feat: build content agent") mid-session; the `/review` fix round (3 issues) is uncommitted on top — **developer commits their own work in this project**, no commits made by me.

- `server/src/db/profile.ts` — new. `getProfile()` moved here from `agents/trends-agent.ts` (pre-planned in feature 09's Decisions: "when a third consumer appears, move it" — `content-agent.ts` is that third consumer). All three call sites (`trends-agent.ts`, `jobs/scheduler.ts`, `jobs/daily-trends.ts`) updated to import from here.
- `server/src/agents/content-agent.ts` — real implementation, replacing the stub. `classifyKind()` (closed-set LLM call, `"reel" | "caption"`, falls back to `"reel"`), `generateReel()`/`generateCaption()` (temp 0.7 via per-call `{ temperature }` option — not `.bind()`, see Problems Solved), `smalltalkReply()` (separate branch for `state.intent !== "content"`), `getStoredScripts()` (exported, mirrors `getStoredTrends()`), `contentAgent()` orchestrating all of the above with a single outer try/catch.
- `server/src/routes/scripts.ts` — new. `GET /api/scripts` via `getStoredScripts()` (no raw `collections.*` access in the route). No `POST` route — confirmed decision, generation only happens through chat.
- `server/src/types/index.ts` — `ScriptDoc` reworked from one generic `body: {hook,body,cta,variants?}` shape into a discriminated union on `kind`: `ReelScriptDoc` (`hook`/`body`/`cta`), `CaptionScriptDoc` (`variants: string[]`), `CarouselScriptDoc` (`text`, unused — schema-complete only).
- `server/src/index.ts` — mounted `scriptsRouter` at `/api/scripts`.
- `client/src/lib/types.ts` — `Script`/`ReelScript`/`CaptionScript`/`CarouselScript` added, mirroring the server union (JSON-serialized: `_id`/`created_at` as strings). `client/src/lib/mock-scripts.ts` deleted.
- `client/src/lib/api.ts` — `getScripts()` added.
- `client/src/components/common/Chip.tsx` — new. Extracted canonical chip-button className (was copy-pasted 4×), thin wrapper over `<button>` accepting standard props + `className` passthrough.
- `client/src/lib/useChatPrompt.ts` — new. One-line hook wrapping `navigate("/", { state: { prompt } })` (was copy-pasted 4×).
- `QuickChips.tsx`, `TrendCard.tsx`, `TrendsPage.tsx`, `ScriptCard.tsx`, `ScriptsPage.tsx` — all updated to use `Chip`/`useChatPrompt` instead of inline duplicates. `ScriptCard.tsx` also rewritten for the new discriminated-union type (caption now renders numbered `Option 1/2/3:` variants, not one paragraph) and real kind labels (`KIND_LABEL` map replacing the old per-mock `badgeLabel`). `ScriptsPage.tsx` fetches real data via `getScripts()` with loading/error/empty states, matching `TrendsPage.tsx`'s pattern.
- `context/architecture.md` — `scripts` schema section rewritten for the discriminated union; `server/db/` folder tree updated to list `profile.ts`.
- `context/ui-registry.md` — `/imprint`: new `Chip` entry; `ScriptCard`'s existing entry updated in place (not duplicated) with the extraction + caption-variants-rendering change.
- `context/progress-tracker.md` — feature 11 ticked, phase advanced to 5 (Calendar), full Decisions/Notes trail recorded.

## Decisions made

- **`ScriptDoc`/`Script` is a discriminated union on `kind`**, not one generic `body` shape — `/architect`-confirmed (Q1). Caption's `variants: string[]` (plural, real variations) replaces feature 10 mock's single `text` field.
- **content-agent generates `reel` and `caption` only** — `/architect`-confirmed (Q2). Carousel stays schema-only, matching `ScriptCard`'s pre-existing "not yet implemented" placeholder.
- **`GET /api/scripts` only, no `POST`** — `/architect`-confirmed (Q3). Content-agent saves internally via the graph, same as trends' scan job; no HTTP round-trip needed.
- **`trend_id` stays unset** — `/architect`-confirmed (Q4). No structured trend reference travels through free-text chat; guessing via title-match was ruled out as fragile.
- **`contentAgent` branches on `state.intent`, not just message content.** `graph.ts` routes both `"content"` and `"smalltalk"` to the content node. Added an explicit `if (state.intent !== "content")` branch to a separate `smalltalkReply()` so a greeting doesn't get sent through the script-generation prompt — also resolves the fallback-path gap feature 03's Decisions log had flagged as deferred.
- **Temperature 0.7 via a per-call `{ temperature }` option on `llm.invoke()`**, not `.bind()`/`.withConfig()` — verified against the installed `@langchain/core@1.2.1` (no `.bind()` on this version's `Runnable`) and `@langchain/google`'s `ChatGoogleFields` (confirms `temperature` is a valid call option). Doesn't touch the shared `lib/llm.ts` singleton.
- **`getProfile()` relocated to `db/profile.ts`** now that content-agent is the third consumer — exactly the trigger condition feature 09 pre-recorded, done now rather than deferred further.

## Problems solved

- **`llm.bind({ temperature: 0.7 })` would have failed at runtime.** Checked the installed package directly rather than trusting training-data LangChain API shape (`library-docs.md`'s own rule): `@langchain/core@1.2.1`'s `Runnable` prototype has no `.bind()` method (only `.withConfig()`, `.withFallbacks()`, etc.). Instead confirmed `temperature` is part of `BaseChatGoogleCallOptions` (`ChatGoogleFields`), so `llm.invoke(messages, { temperature: 0.7 })` works directly per-call — simpler than either `.bind()` or `.withConfig()` would have been anyway.
- **`/review` fix 1 (Important): `routes/scripts.ts` originally called `collections.scripts()` directly**, breaking the boundary `routes/trends.ts` → `getStoredTrends()` had already established (confirmed intentional in feature 08's Decisions). Added `getStoredScripts()` to `content-agent.ts`, pointed the route at it, re-verified live.
- **`/review` fix 2 (Minor): `architecture.md`'s `server/db/` folder tree was missing `profile.ts`.** Added.
- **`/review` fix 3 (Minor): `captionGenerationSchema`'s `variants` bound was `.min(1)`**, looser than the "3 variations" prompt intent — a degenerate 1-variant response would've silently passed. Tightened to `.min(2)` as a safe floor (rejects the true degenerate case without failing over the model returning 2 instead of 3); re-verified live that a real generation still passes.
- **`vite`/server dev-process backgrounding**: same gotcha as prior sessions — `npm run dev` must be its own top-level backgrounded Bash call, nothing else in the command. After `TaskStop`, the underlying Windows process sometimes keeps the port held (npm's child process not reaped) — confirmed via `Get-NetTCPConnection -LocalPort <port> -State Listen` and force-killed the owning PID with `Stop-Process` when that happened.

## Current state

- **Feature 11 complete: built, imprinted, reviewed, all findings fixed, verified live at every stage** — reel generation, caption generation (3 real variants), and a smalltalk greeting all tested via `curl` through the real compiled graph; Playwright pass against the real dashboard confirmed chat generation, `/scripts` rendering real data, script-card chip → chat prefill → clear-on-reload, and **`/trends` re-verified unaffected by the `Chip`/`useChatPrompt` refactor** (the specific regression check the developer asked for). Zero console/page errors throughout. `tsc -b --noEmit` clean on both `server/` and `client/`.
- **Repo state:** branch `contentAgent`, commit `47164f7` at HEAD (developer's own commit, initial build — 20 files), plus uncommitted changes on top from the `/review` fix round: `server/src/agents/content-agent.ts`, `server/src/routes/scripts.ts`, `context/architecture.md`, `context/progress-tracker.md`. **Developer commits their own work** — no commit made by me this session.
- Dev servers (server on 3001, client/Vite on 5173) were started twice this session (initial verification, then re-verification after the review fixes) and explicitly stopped + force-killed both times; ports confirmed free at session end.
- A PR summary (major changes + a server/client-folder-only file list) was requested and produced this session — see the conversation for the exact text, not duplicated here.

## Next session starts with

Confirm the review-fix-round commit is in and the repo is clean, then proceed to **Feature 12 — Calendar Panel — Full UI (Mock)**: month grid + event list matching `context/designs/glam-ai.html`, today highlighted, event dots, an "Add event" chip present with no write yet (calendar reads/writes come in features 13–14). Run `/architect` first per the project's loop.

## Open questions

- Whether `YOUTUBE_API_KEY` quota usage from repeated live verification runs across sessions is a concern — informational only, no action taken.
- `@langchain/google` still pre-1.0 (0.2.x) and `@langchain/core` is at 1.2.1 — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
- The `getStoredScripts()`/`getStoredTrends()` boundary pattern (routes call an exported agent-module function, never raw `collections.*`) is now used twice — worth keeping in mind as a standing convention for any future `routes/*.ts` file (calendar, DMs, contracts), not just documented after the fact each time.
