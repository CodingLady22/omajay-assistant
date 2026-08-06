# Memory — Feature 06: Trends Panel (Full UI, Mock)

Last updated: 2026-08-03

## What was built

**Feature 06, built, reviewed, fixed, verified — committed on branch `trendsPanelUI` (commit `1d58c78`):**

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
- **Playwright verification tooling (no project dependency added):** `npx playwright` resolves to whatever's cached; if a later invocation picks a different cached version, browsers must be reinstalled for that version (`npx playwright install chromium`), and scripts need to run from inside the npx cache dir with `node_modules/playwright` for ESM `import` to resolve (`NODE_PATH` doesn't work for ESM). Used only for verification — nothing added to `package.json`.

## Current state

- **Features 01–06 complete**, all committed and merged/pushed per branch history (`trendsPanelUI` has one commit, `1d58c78`, containing all of feature 06 including both post-review fixes).
- `tsc -b --noEmit` clean on `client`. Verified live end-to-end (not mocked): trend-card click → prefill → send → real response through the compiled LangGraph, orchestrator correctly routing to the `content` stub. All three responsive breakpoints checked against `glam-ai.html`, zero console errors.
- **`/code-review` was run on the full `main...trendsPanelUI` diff and found 3 unresolved findings — not yet fixed, not yet decided on:**
  1. **`context/ui-registry.md`'s `TrendCard` entry (and the pre-existing `ChatPanel` entry above it) document stale bracket-syntax Tailwind classes** (e.g. `px-[11px] py-[9px]`) that no longer match the actual component code, which now uses fractional-scale classes (`px-2.75 py-2.25`) — apparently auto-converted by an IDE/linter during the session (see next finding). A future session copying patterns from the registry would introduce a *third*, inconsistent notation.
  2. **An out-of-scope Tailwind bracket→fractional-scale reformat got bundled into this feature's diff** — `ComingSoonPanel.tsx` (`px-[22px] py-[18px]` → `px-5.5 py-4.5`) and several pre-existing lines in `ChatPanel.tsx` (`flex-shrink-0`→`shrink-0`, `rounded-[14px]`→`rounded-lg`, etc.) were rewritten even though neither file's *logic* needed touching for this feature. This appears to be automatic (IDE/linter "canonicalize Tailwind classes" behavior, flagged by `ide_diagnostics` throughout the session as `suggestCanonicalClasses` warnings), not something deliberately authored — but it's now sitting in the committed diff and violates `code-standards.md`'s scope rule ("build only what the current feature needs").
  3. **Textarea auto-resize logic is duplicated** between the new prefill `useEffect` and the pre-existing `handleInput` function in `ChatPanel.tsx` (same 3-line resize block in both places) — a shared `resizeTextarea(el)` helper would prevent the two copies drifting apart.
- None of these are functional bugs — `tsc`/`eslint` are clean and behavior is verified correct. They're cleanup/consistency items.

## Next session starts with

**Decide on the 3 `/code-review` findings above before starting feature 07** (or explicitly decide to defer them) — they're cheap to fix (docs sync, a few `git diff`-driven reverts or keeps, one small helper extraction) but are currently unresolved on a committed branch.

Then: **Feature 07 — YouTube + Instagram Trend Services** (`server/services/youtube.ts`, `server/services/instagram.ts`, `server/services/tiktok.ts` stub). This needs real `YOUTUBE_API_KEY` / `INSTAGRAM_TOKEN` credentials — **ask the developer whether those are ready**, same pattern as the WhatsApp-token check that led to deferring feature 05. If not ready, apply the same resequencing treatment (defer + note in `build-plan.md`/`progress-tracker.md`) rather than blocking.

## Open questions

- The 3 `/code-review` findings (ui-registry drift, out-of-scope Tailwind reformat, duplicated resize logic) — fix now, fix later, or accept as-is? Not yet decided.
- Whether `YOUTUBE_API_KEY` / `INSTAGRAM_TOKEN` are available for feature 07.
- `@langchain/google` still pre-1.0 (0.2.x) — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
