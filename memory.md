# Memory — Feature 03: LLM Client + Graph Skeleton

Last updated: 2026-06-23

## What was built

- **Feature 03, fully built, verified, and reviewed:**
  - `server/src/lib/llm.ts` — exports `llm`, a `ChatGoogle` instance (from `@langchain/google/node`) using `getLlmEnv().GEMINI_API_KEY`, model `gemini-2.5-flash`, temperature 0.3.
  - `server/src/agents/state.ts` — `AgentState` (`Annotation.Root`: `input`, `channel`, `intent`, `response`, `runId`, `approval`).
  - `server/src/agents/orchestrator.ts` — one LLM call classifies `state.input` into one of the seven fixed intents; output is hard-validated against a zod enum (trimmed/lowercased), anything that doesn't match exactly — or any LLM-call failure — coerces to `smalltalk`. LLM-call failures are caught and logged via `logger.error()`.
  - Five stub specialist nodes (`trends-agent.ts`, `content-agent.ts`, `calendar-agent.ts`, `dms-agent.ts`, `contracts-agent.ts`) — each returns a fixed placeholder response (e.g. `"[trends] stub response"`), no try/catch (no I/O yet, so nothing to catch).
  - `server/src/agents/graph.ts` — compiled `StateGraph` wiring `orchestrator` → the five stubs via `addConditionalEdges`, matching the fixed intent map.
  - `server/src/agents/run-graph-test.ts` + `npm run graph:test` — CLI verification script (no HTTP route exists until feature 04, so this script stands in as the caller): generates one `runId` per sample input, invokes the compiled graph directly, logs intent + response.
  - Installed: `@langchain/langgraph`, `@langchain/core`, `@langchain/google` (deliberately **not** `@langchain/google-genai` — see Decisions).

- **Context docs updated:** `AGENTS.md`, `architecture.md`, `code-standards.md`, `library-docs.md`, `progress-tracker.md` — all updated for the package switch, the deferred `logAgentError`, and a tightened rule about which nodes must set `response`.

## Decisions made

- **Switched `@langchain/google-genai` → `@langchain/google`.** Found mid-build that `@langchain/google-genai` (the package named throughout the original docs) carries an active deprecation notice pointing to `@langchain/google`. Confirmed by installing the package and reading its real `.d.ts` files — no migration debt incurred since this was caught before any code was written against the old package. `ChatGoogle` must be imported from the `/node` entrypoint (`@langchain/google/node`), not the package root — confirmed directly from `node_modules/@langchain/google/dist/chat_models/node.d.ts`. The package is pre-1.0 (`0.2.1`); `code-standards.md` flags it for a stability re-check during the pre-production multi-provider hardening pass.
- **`runId`** is generated once by the caller (the future route/webhook; the test script stands in for now) — never inside a node.
- **`logAgentError` deferred** to the first feature that actually reads agent logs back (debug tooling or a review pass). Nodes use `logger.error()` until then. This gap is documented in two places: a decision note in `progress-tracker.md`, and — after the review caught that the first pass missed it — a caveat directly above `code-standards.md`'s Agent Nodes template, so a future session doesn't "fix" the code to match the template instead of recognizing the template is aspirational.
- **`library-docs.md` rule tightened:** "every node returns `Partial<AgentState>` with at least `response`" → "every *specialist* node" — the orchestrator is explicitly exempted since its only job is classification (it returns `{ intent }` only).
- **Recorded, not built:** once `content-agent` stops being a stub (phase 4, feature 11), the orchestrator's smalltalk-fallback-on-classification-failure path needs a real user-facing message (e.g. "I didn't catch that — try again") instead of silently landing in the real content agent with no explanation. Noted in `progress-tracker.md`.

## Problems solved

- `@langchain/google`'s real constructor/import shape couldn't be reliably pinned down from web docs alone (conflicting info on import path, version claims, stability) — resolved by installing the package and reading its actual `.d.ts` files directly: `ChatGoogle` (aliased from `ChatGoogleNode`) lives at `@langchain/google/node`, constructor takes `{ apiKey, model, temperature, ... }`.
- `server/.env` had a `GEMINI_API_KEY=` line with an empty value (key never actually set, despite the line existing) — caught because the live verification step failed loudly instead of being silently mocked/skipped. User filled in the real key; verification then passed cleanly against the live Gemini API.

## Current state

- Features 01, 02, and 03 are all complete, reviewed, and ticked off in `context/progress-tracker.md`. Phase 1 — Foundation has one feature left.
- `npm run graph:test` passes against the live Gemini API: all 7 sample inputs (one per intent + one deliberately ambiguous "good morning!") classify correctly, including `smalltalk` falling through to the content stub.
- `tsc --noEmit` is clean.
- Nothing has been committed to git yet this session — consistent with every prior session on this project.

## Next session starts with

Feature 04 — Chat Route + Dashboard Shell: `POST /api/chat` (runs the graph with `channel: "web"`, returns `{ success, data: { response } }`), plus the `/client` dashboard shell (sidebar + topbar + panel switching matching `context/designs/glam-ai.html`), with the chat panel wired to `/api/chat` to confirm the stub reply round-trips. Read `.agents/skills/architect/SKILL.md` and run that process first, per the engineering loop — it's not a slash command in this harness.

## Open questions

- Worth checking with the user whether to commit features 01–03 as a checkpoint before starting feature 04 — nothing has been committed across any session so far.
- `@langchain/google` is pre-1.0 (0.2.x) — no action needed now, but flagged for a stability re-check during the pre-production multi-provider hardening pass (when Anthropic/OpenAI fallbacks get added).
