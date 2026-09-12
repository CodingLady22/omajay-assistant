# Memory — Feature 27: Script Chat Editing

Last updated: 2026-09-12

## What was built

**Feature 27 (new, developer-requested scope — not part of the original 26-feature build-plan, sequenced after 25).** Script generation was previously one-way: a generated script landed in the library as a dead end. This feature makes it conversational — an "Edit" action on a script card opens the chat panel with that script loaded into a locked editing session; she iterates with plain-language instructions across as many turns as she wants; nothing is saved until she explicitly commits.

Files touched (client/server only — see the PR summary given to the developer this session for the exact list; `context/build-plan.md` and `context/progress-tracker.md` were also updated but aren't code):

- `server/src/types/index.ts` — added `ReelScriptDraft`/`CaptionScriptDraft`/`ScriptDraft` (the editable subset of a script, no `_id`/`status`/`created_at`).
- `server/src/agents/content-agent.ts` — added `reviseScript()` (bypasses the orchestrator/graph entirely, reuses/tightened the existing generation zod schemas) and `updateScript()` (commits the final draft).
- `server/src/routes/scripts.ts` — added `POST /:id/revise` and `PUT /:id`, zod-validated.
- `client/src/lib/types.ts` / `client/src/lib/api.ts` — mirrored `ScriptDraft` type + `reviseScript()`/`saveScript()` wrappers.
- `client/src/components/scripts/ScriptCard.tsx` — new "Edit ✎" chip (reel/caption only), navigates to `/` carrying the whole script via router state.
- `client/src/components/chat/ChatPanel.tsx` — reads `editScript` from router state into locked `editingScript` mode; revise-only send path; Save/Discard handlers.
- `client/src/components/chat/ScriptEditBanner.tsx` — new component (title + Save/Discard), reuses `EventItem`'s established primary-button/`Chip`/plain-text-error precedents.
- `client/src/components/chat/MessageBubble.tsx` — added `whitespace-pre-line` so multi-line revised drafts render correctly.

Committed in `f7c3bdd` ("feat: add editing function to the written scripts"). A `/code-review` pass afterward found two real issues (see Problems Solved), fixed with one more round of edits to `content-agent.ts` and `ChatPanel.tsx` — **these fixes are built, type-checked, and live-verified but not yet committed** (see Current state).

## Decisions made

- **Chat is 100% stateless server-side** (no conversation history, no session store — confirmed by reading the codebase before designing anything) — so the working copy of an in-progress edit lives entirely in `ChatPanel`'s local React state, sent in full (not a delta) on every revise turn. No new DB collection, no server-side session.
- **No new orchestrator intent, no `AgentState` field, no graph node.** `/revise` calls `reviseScript()` directly, bypassing the orchestrator entirely — the client already knows it's mid-edit for a specific script, so there's nothing to classify. `architecture.md`'s fixed intent set is untouched. Same category of disclosed boundary extension as `routes/trends.ts` → `agents/trends-agent.ts` (feature 08).
- **Save is a dedicated `PUT /api/scripts/:id` button, never inferred from chat text** — matches the calendar's propose-then-confirm split.
- **Sidebar-navigation-away discards silently, no confirmation dialog.** `editingScript` lives only inside `ChatPanel` (never lifted to `App.tsx`/a cross-route context), so a route change unmounts it automatically — the default behavior of route-scoped state. Matches `EventItem`'s bare Discard precedent, not `DocumentRow`'s real-data-loss delete (which does use `ConfirmDialog`).
- **Edit mode fully locks the chat panel** — no interleaving general requests, since there's no mechanism to carry the working copy through an unrelated graph round-trip.
- **`carousel` stays out of scope** — `content-agent.ts` never generates that kind (feature 11); Edit only renders for `reel`/`caption`.

## Problems solved

- **Local dev environment: MongoDB Atlas connection failing with a TLS handshake error** (`MongoServerSelectionError` / SSL alert 80) on every boot-retry. Root cause: the dev machine's public IP rotated off Atlas's IP access list after a power outage. Not a code issue — resolved by the developer updating the Atlas access list. Worth remembering if this recurs after a power/network interruption.
- **`/code-review` (2026-09-12) caught two real issues in the initial build, both fixed:**
  1. **Schema mismatch trapping an edit session.** `reviseScript()`'s output schema had no `.min(1)` on text fields, but the request-body schema validating the *next* turn's `currentDraft` already did — so an LLM-produced empty field (e.g. she says "remove the CTA") was silently accepted on turn N, then rejected on turn N+1, trapping the session (could neither revise nor save, only Discard). Fixed by adding matching `.min(1)` constraints to `reelGenerationSchema`/`captionGenerationSchema` in `content-agent.ts`, so an empty field is rejected the same turn it's produced — it never merges into the working copy (`ChatPanel.tsx` only calls `setEditingScript` on success), so the next turn always sends the last-good draft.
  2. **Stale error banner.** The revise branch of `ChatPanel.tsx`'s `handleSend` never cleared `editError`, so a previous failed-Save error kept showing through subsequent successful revise turns. Fixed with one line (`setEditError(null)` at the top of the `editingScript` branch).
  - Re-verified live, twice over: a deterministic standalone zod check proving the two schemas now agree; a live Playwright run using `page.route()` to force a real Save failure (proving the stale-error fix) then a successful revise (proving it clears); and the actual "remove the CTA" trap reproduced against the real LLM (Gemini genuinely returned an empty `cta`, server rejected it immediately, session recovered with a normal follow-up revise and a successful Save). Two earlier flaky runs of the same live LLM call were investigated and ruled out as unrelated transient network/parse hiccups before trusting the final clean run.

## Current state

- Feature 27 fully built and live-verified twice (once after initial build, once after the code-review fixes). `tsc -b --noEmit` clean on both `server/` and `client/` as of the latest fix.
- Bulk of the feature is committed (`f7c3bdd`). **The two code-review fixes are NOT yet committed** — working tree has `content-agent.ts` (schema fix) and `ChatPanel.tsx` (stale-error fix) modified, plus `MessageBubble.tsx` showing modified from IDE auto-formatting only (arbitrary Tailwind values like `rounded-[14px]`/`px-[22px]` canonicalized to `rounded-lg`/`px-5.5` etc. — no functional change), plus `context/progress-tracker.md` updated with full decisions.
- No dev servers left running. Scratch Playwright verification directories under `/c/tmp` were cleaned up where possible (one or two may linger due to a known Windows file-lock quirk on this machine — harmless, outside the repo, self-clears).
- `progress-tracker.md` has feature 27 checked off `[x]` in Phase 11, with the full code-review-and-fix story recorded in Decisions.

## Next session starts with

Nothing is queued automatically. The plan's next numbered item is still **Feature 26 — Single-user Auth** (Phase 10) — it was skipped over, not superseded, by this developer-requested feature 27. Per the standing instruction carried over multiple sessions now: don't start it without re-confirming the plan is still accurate first (re-read `build-plan.md`'s feature 26 entry and re-`/architect`).

Before that: the developer should decide how to commit this session's remaining changes (the two code-review fixes + the `MessageBubble.tsx` auto-format + the progress-tracker update) — ask, don't assume, whether these get squashed into a follow-up commit, amended into `f7c3bdd`, or left separate.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20/25, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, watch-only.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, deferred to the production cutover.
- Whether `ContractCard`'s duplicated download-link className should be extracted — carried over, deferred until a third occurrence.
- Feature 22's briefing 14-day recency cap could eventually be replaced with a real `status`-based filter — carried over, still a future polish candidate.
- No editable-preview UI exists for an in-progress script edit beyond the chat transcript itself (by design, confirmed during this feature's `/architect`) — if that ever feels insufficient in practice, revisit.
