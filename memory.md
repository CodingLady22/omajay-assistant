# Memory — Feature 06: Trends Panel (Full UI, Mock) — shipped

Last updated: 2026-08-03

## What was built

**Feature 06, built, reviewed, fixed, verified, cleaned up, merged to `main` via PR #6.** Branch `trendsPanelUI` is done; current branch is `trendServices` (freshly created off `main`, no changes yet) — next up is feature 07.

- `client/src/lib/mock-trends.ts` — `Trend` type + `MOCK_TRENDS` (6 entries: 3 Instagram, 3 YouTube — the design mock's 2 TikTok cards dropped per project scope, replaced with 2 extra YouTube cards for balance).
- `client/src/components/trends/TrendCard.tsx` — clickable card matching `glam-ai.html`'s `.trend-card` pixel values exactly (88px thumb, 12px title, 11px pink metric line, etc.), built entirely from `@theme` tokens (no hardcoded hex). Click calls `navigate("/", { state: { prompt } })`.
- `client/src/pages/TrendsPage.tsx` — real grid (`repeat(auto-fill,minmax(158px,1fr))`), replacing `ComingSoonPanel`.
- `client/src/components/chat/ChatPanel.tsx` — reads a prompt out of router state and prefills the chat textarea (does **not** auto-send, unlike the static mock's `goChat()`). Refactored twice after initial build (see Problems solved).
- `client/src/index.css` + `context/ui-tokens.md` — added `--shadow-card-hover` token (`0 2px 12px rgba(212,83,126,0.10)`), matching the design's `.trend-card:hover` shadow, following feature 04's `--shadow-shell`/`--color-backdrop` precedent.
- `context/ui-registry.md` — `TrendCard` entry imprinted.
- `context/build-plan.md` / `context/progress-tracker.md` — feature 06 ticked; feature 08 now carries a note to consolidate the client-mock `Trend` type with the server schema when real data is wired in.

**Also this session — WhatsApp deferral (precedes feature 06):**

- Feature 05 (WhatsApp Webhook + Send) marked **DEFERRED** in `build-plan.md` and `progress-tracker.md` — blocked on a Meta API token that isn't available yet. Not cancelled, resequenced. From feature 06 onward, "verify on WhatsApp" build-plan steps are read as "verify via dashboard chat."
- `build-plan.md`'s feature 21 (morning briefing) now documents a pluggable-delivery seam (dashboard/console now, `sendWhatsApp` swapped in once 05 lands) — recorded only, not built.

## Decisions made

- **Trend-card click prefills the chat input; does not auto-send.** Deliberate divergence from the static design mock's `goChat()` (confirmed via `/architect`) — she reviews/edits before sending.
- **Mechanism: React Router state, not context/global store.** `TrendCard` passes `navigate('/', { state: { prompt } })`; `ChatPanel` consumes it once.
- **Mock set: 3 Instagram + 3 YouTube, no TikTok** — rebalanced from the design's 3 IG + 1 YT + 2 TT.
- **`--shadow-card-hover` token added proactively** for reuse by future clickable cards (Scripts, Contracts).
- **Mock `Trend` type lives in `client/src/lib/mock-trends.ts` for now** — flagged in `build-plan.md`'s feature 08 entry to consolidate with the server schema when real data replaces the mock.

## Problems solved

- **`/review` finding (fixed):** `ChatPanel.tsx` originally read `location.state as { prompt?: string } | null` — a bare type assertion with no comment, violating `code-standards.md`. Replaced with `in`-operator narrowing (`"prompt" in state && typeof state.prompt === "string"`) — no assertion needed, `tsc` clean.
- **IDE lint finding (fixed):** the fix above still lived inside a `useEffect` that called `setInput(prompt)` synchronously — flagged by the `react-hooks` "setState synchronously in an effect" rule. Root cause: deriving `input`'s initial value doesn't need an effect, since the prompt is already known at mount. Refactored to a top-level `extractPrompt(state: unknown)` helper used as `input`'s **lazy `useState` initializer** (`useState(() => extractPrompt(location.state) ?? "")`) plus a `hadPromptRef` boolean. The remaining `useEffect` only does genuine side effects (clear router state, focus/resize textarea) with no `setState` call in its body. Re-verified via Playwright — prefill and post-reload-clear behavior unchanged.
- **Sandbox networking:** the dev server's MongoDB Atlas connection intermittently fails with DNS `ENOTFOUND` on the SRV record (`_mongodb._tcp.cluster0.j4cxed4.mongodb.net`) — general DNS works fine, it's specific to the SRV lookup type. Transient in this session (cluster was restarted mid-session and connected fine afterward — 4th of 5 bounded retry attempts). Not a code issue; if it recurs, it's an infra/network flake, not something to "fix" in `db/client.ts`.
- **Playwright verification tooling (no project dependency added):** `npx playwright` resolves to whatever's cached; if a later invocation picks a different cached version, browsers must be reinstalled for that version (`npx playwright install chromium`), and scripts need to run from inside the npx cache dir with `node_modules/playwright` for ESM `import` to resolve (`NODE_PATH` doesn't work for ESM).
- **`/code-review`'s 3 post-merge findings (fixed):**
  1. **Out-of-scope Tailwind reformat reverted.** `ComingSoonPanel.tsx` and `ChatPanel.tsx` had picked up an IDE auto-canonicalization (`px-[22px]`→`px-5.5`, `flex-shrink-0`→`shrink-0`, `rounded-[14px]`→`rounded-lg`, etc.) on lines unrelated to this feature's logic. Manually reverted both files to bracket syntax; `ComingSoonPanel.tsx` is now byte-identical to `main` (zero diff), `ChatPanel.tsx`'s diff against `main` shows only the real prefill-feature changes. Confirmed via `git diff main` and a fresh Playwright screenshot (pixel-identical).
  2. **`ui-registry.md` re-imprinted.** `TrendCard`'s spacing row updated to match the component's actual (left as-is, canonicalized) classes — `px-2.75 py-2.25` / `mb-0.75` / `mb-1.25` — rather than reverting the component itself. Height and badge-padding correctly stay untracked per `/imprint`'s own rules.
  3. **Duplicated textarea-resize logic extracted.** New top-level `resizeTextarea(el: HTMLTextAreaElement): void` helper in `ChatPanel.tsx`, called from both the prefill effect and `handleInput` — the old 3-line inline block is gone from both call sites.
  All three verified: `tsc -b --noEmit` and `eslint` clean across every feature-touched file, Playwright re-confirms prefill + post-reload-clear behavior unchanged. Committed as `5e9a2ea "fix: clean up UI issues found during review"`, merged via PR #6 (`91a7f9d`). Used only for verification — nothing added to `package.json`.

## Current state

- **Features 01–06 complete, shipped.** `trendsPanelUI` merged to `main` via PR #6 (`91a7f9d`), including the initial build (`1d58c78`) and the post-review cleanup (`5e9a2ea`). All 3 `/code-review` findings from the cleanup pass are resolved — see Problems solved.
- `tsc -b --noEmit` and `eslint` clean on every feature-touched client file. Verified live end-to-end (not mocked): trend-card click → prefill → send → real response through the compiled LangGraph, orchestrator correctly routing to the `content` stub. All three responsive breakpoints checked against `glam-ai.html`, zero console errors — re-confirmed identical after the cleanup pass.
- **Now on branch `trendServices`** (created off `main`, zero diff so far) — ready to start feature 07.

## Next session starts with

**Feature 07 — YouTube + Instagram Trend Services** (`server/services/youtube.ts`, `server/services/instagram.ts`, `server/services/tiktok.ts` stub), on the already-created `trendServices` branch. This needs real `YOUTUBE_API_KEY` / `INSTAGRAM_TOKEN` credentials — **ask the developer whether those are ready**, same pattern as the WhatsApp-token check that led to deferring feature 05. If not ready, apply the same resequencing treatment (defer + note in `build-plan.md`/`progress-tracker.md`) rather than blocking. Run `/architect` first per the project's loop.

## Open questions

- Whether `YOUTUBE_API_KEY` / `INSTAGRAM_TOKEN` are available for feature 07.
- `@langchain/google` still pre-1.0 (0.2.x) — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
