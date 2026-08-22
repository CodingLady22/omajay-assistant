# Memory — Feature 19: Contracts Panel (Full UI, Mock)

Last updated: 2026-08-22

## What was built

Feature 19 shipped via the full loop: `/architect` → build → `/review` (2 issues found, both fixed, re-reviewed clean) → ticked in `progress-tracker.md`. Pure client-side mock UI — no server changes.

- `client/src/lib/mock-contracts.ts` — new. `Contract`/`ContractStatus` types (`id`, `brand`, `dealSummary`, `status: "draft" | "sent"`, `editPrompt`) + `MOCK_CONTRACTS` (3 entries: Velour Cosmetics/sent, Glosswear Beauty/sent, Lumière Beauty/draft).
- `client/src/components/contracts/ContractCard.tsx` — new. Static (non-button) card matching `ScriptCard`'s shape: brand + neutral status badge header row, deal-summary body, two action chips ("Download PDF" disabled, "Edit terms ↗" wired to `useChatPrompt()`).
- `client/src/pages/ContractsPage.tsx` — rewritten, replacing the `ComingSoonPanel` stub with `MOCK_CONTRACTS.map(...)`.
- `context/ui-registry.md` — new `ContractCard` entry (`/imprint` run).
- `context/progress-tracker.md` — feature 19 ticked, decisions trail recorded, current status moved to feature 20.

## Decisions made

- **Mock brands reuse names already alive elsewhere** (Velour Cosmetics + Glosswear Beauty from the feature-18 RAG fixtures, Lumière Beauty from the DMs design mock) instead of inventing new ones — keeps every panel's mock data telling one consistent story, and means feature 20's real drafting will retrieve against brands this panel already shows.
- **Status badge is neutral `bg-info-bg text-info` for both `draft` and `sent`**, differentiated only by label text, not colour — extends `ScriptCard`'s existing rule that the DM pink/green pair is reserved for DM classification only.
- **"Edit terms ↗" vs "Download PDF" deliberately behave differently.** Edit terms is a normal chat-prefill `Chip` (matches every other mock-era action). Download PDF is rendered `disabled` with no handler — no real PDF exists until feature 20 builds `services/pdf.ts` — following `CalendarGrid`'s prev/next-chevron precedent (bare `disabled`, no tooltip, no handler).
- **`Contract` type stays in a client-only mock file for now**, with a stable `id` from the start. Flagged for feature 20 to consolidate into `client/src/lib/types.ts` and delete the mock file — same pattern trends/scripts/calendar all followed when real data landed.

## Problems solved

- `/review` caught two precedent deviations before they shipped, both fixed:
  1. `ContractsPage.tsx` originally had an empty-state branch that was unreachable dead code (`MOCK_CONTRACTS` is a fixed 3-item array) — and directly contradicted the project's own settled precedent (`TrendsPage.tsx` shipped with no empty check in its mock-only feature 06; feature 10's `/code-review` explicitly ruled that empty-state branches belong with real fetching, not mock-only UI). Removed.
  2. The disabled "Download PDF" chip originally had a `title` tooltip explaining itself — a new, undocumented pattern (`CalendarGrid`'s disabled chevrons have no tooltip). Dropped to match precedent exactly.

## Current state

- **Feature 19 complete, reviewed (0 issues after fixes), ticked in `progress-tracker.md`.** `tsc -b --noEmit` clean on `client/`.
- Verified live via Playwright: `/contracts` screenshotted at all 3 responsive breakpoints, zero console/page errors. Click-through confirmed "Edit terms ↗" prefills chat with its exact bespoke prompt and the prefill clears on reload; "Download PDF" confirmed visibly and functionally disabled.
- Repo state: branch `contractsPanel`. Nothing committed by me this session — developer commits their own work, per established pattern.
- No dev servers left running (both the Vite dev server used for verification and its Playwright driver were stopped after testing).

## Next session starts with

**Feature 20 — Contracts Agent (Retrieve, Draft, PDF)**, per `build-plan.md` Phase 7: `server/src/rag/retrieve.ts` (vector search top-k), `server/src/agents/contracts-agent.ts` (LLM drafts grounded only in retrieved chunks, explicit "no results" vs "index missing" distinction per the follow-up recorded in feature 18), `server/src/services/pdf.ts` (pdf-lib rendering → GridFS), `POST /api/contracts/draft`, `GET /api/contracts`, `GET /api/contracts/:id/pdf`. Also the point where `Contract`'s type gets consolidated into shared `types.ts` and `mock-contracts.ts` is deleted, and `ContractsPage.tsx` gets real loading/error/empty states (matching `TrendsPage.tsx`'s pattern). Run `/architect` first per the project's loop.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18, unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over from prior sessions, no action needed yet.
- Whether the dev/test Google Calendar (service-account-owned "tester" calendar) gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern (tooltip on disabled buttons) should become a deliberate app-wide decision later — raised during this feature's `/review`, deliberately not decided now.
