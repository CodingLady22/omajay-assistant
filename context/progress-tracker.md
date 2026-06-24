# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** 1 — Foundation
**Last completed:** 03 LLM Client + Graph Skeleton
**Next:** 04 Chat Route + Dashboard Shell

---

## Progress

### Phase 1 — Foundation

- [x] 01 Monorepo Scaffold
- [x] 02 MongoDB Connection + Collections
- [x] 03 LLM Client + Graph Skeleton
- [ ] 04 Chat Route + Dashboard Shell

### Phase 2 — WhatsApp

- [ ] 05 WhatsApp Webhook + Send

### Phase 3 — Trends

- [ ] 06 Trends Panel — Full UI (Mock)
- [ ] 07 YouTube + Instagram Trend Services
- [ ] 08 Trends Agent + Scan + Store
- [ ] 09 Daily Trends Scan (Scheduled)

### Phase 4 — Content

- [ ] 10 Scripts Panel — Full UI (Mock)
- [ ] 11 Content Agent + Save

### Phase 5 — Calendar

- [ ] 12 Calendar Panel — Full UI (Mock)
- [ ] 13 Calendar Read
- [ ] 14 Calendar Add — Propose Then Confirm

### Phase 6 — Instagram DMs

- [ ] 15 DMs Panel — Full UI (Mock)
- [ ] 16 DMs Fetch + Classify + Summarise
- [ ] 17 DM Reply — Draft Then Approve

### Phase 7 — Contracts (RAG)

- [ ] 18 Document Ingest + Vector Index
- [ ] 19 Contracts Panel — Full UI (Mock)
- [ ] 20 Contracts Agent — Retrieve, Draft, PDF

### Phase 8 — Morning Briefing

- [ ] 21 Briefing Agent + Scheduled Send

### Phase 9 — Settings + Polish

- [ ] 22 Settings Panel
- [ ] 23 Empty States + Error Handling Pass

---

## Decisions Made During Build

_Add decisions here as they are made during implementation._

- Model: Gemini via `@langchain/google-genai` for now (free tier, dev/test). Client is switching providers before production — Anthropic and OpenAI will be added as fallback providers once it's decided which they prefer; `lib/llm.ts` must keep the provider swappable so this never touches agent code.
- Everything in MongoDB, including contract PDFs (GridFS) and RAG vectors (Atlas Vector Search).
- TikTok stubbed until client gets API access.
- Trends: both scheduled daily scan and on-demand.
- Contract output: editable PDF.
- Only autonomous action: morning WhatsApp briefing (asks plan-for-day + reminds unfinished projects). DM replies and calendar adds always require approval.
- Frontend folder is `client/`, not `web/` as architecture.md originally said — all context docs corrected to match the actual scaffold.
- Server `tsconfig.json` uses `"moduleResolution": "bundler"` (not `"nodenext"`) so `@/` imports stay extension-less, matching the import style shown in `code-standards.md`. TypeScript 6 still needs `baseUrl` alongside `paths` for alias resolution to work, with `"ignoreDeprecations": "6.0"` to silence the TS7 deprecation error.
- Confirmed MONGODB_URI points at an Atlas-tier cluster (required for $vectorSearch).
- Added contracts index { brand: 1, status: 1 } for per-brand draft lookups (used in feature 20).
- Vector search index (documents.embedding) is created via its own script, separate from the boot path — createSearchIndex builds asynchronously and shouldn't be able to block server startup for a feature (contracts, #20) that isn't built yet.
- DB connection (`db/client.ts`): connect once at startup with a bounded retry (5 attempts, ~2s apart, each attempt logged); a client that fails to connect is closed before the next retry; no retry logic after the initial connect succeeds — the driver's own pool handles reconnection from then on.
- `lib/env.ts` restructured: eager `core` schema (just `PORT`, `MONGODB_URI`) validated at module load/boot; everything else (LLM, WhatsApp, Instagram, YouTube, Google Calendar, embeddings) validated lazily via a per-integration getter (`getLlmEnv()`, `getWhatsAppEnv()`, etc.), the first time that integration's code actually runs. A feature's credentials are only required once that feature is built — earlier features aren't blocked by later ones' missing keys.
- LLM key canonicalized as `GEMINI_API_KEY` (was already live in `env.ts`). Confirmed with the client: Gemini now for its free tier, with Anthropic + OpenAI added as fallback providers before production (preference TBD). `architecture.md`, `AGENTS.md`, `code-standards.md`, and `library-docs.md` were all updated to reflect this — `lib/llm.ts` itself is still feature 03's job; only the docs/decisions are settled now.
- Added a graceful shutdown handler (`SIGINT`/`SIGTERM`) in `index.ts` that closes the MongoDB connection before exiting.
- **Feature 03 — switched LLM package from `@langchain/google-genai` to `@langchain/google`.** `@langchain/google-genai` (named throughout the original context docs) carries an active deprecation notice pointing to `@langchain/google` as its replacement. Confirmed directly against the installed package (`@langchain/google@0.2.1`) before writing `lib/llm.ts`, so no migration debt was incurred. `ChatGoogle` is imported from the `/node` entrypoint (`@langchain/google/node`), not the package root. `architecture.md`, `code-standards.md`, `library-docs.md`, and the approved dependency list were all updated to match. `@langchain/google` is pre-1.0 (0.2.x) — worth re-checking its stability during the pre-production multi-provider hardening pass.
- **`logAgentError` deferred.** `code-standards.md`'s node template shows every node's catch block calling `logAgentError(state.runId, error)`, but that helper was never built — `agent_runs`/`agent_logs` collections and types exist (from feature 02) but nothing writes to them yet. Feature 03's orchestrator (the only node in this skeleton with a real failure mode — the live Gemini call) uses the existing `logger.error()` instead. `logAgentError` is intentionally deferred to the first feature that actually needs to read agent logs back (debug tooling or a review pass) — building the Mongo-backed writer now would be persistence plumbing nothing in feature 03 reads or verifies. `code-standards.md` carries a caveat next to the template noting this gap.
- **Orchestrator failure path is a known short-term simplification.** On a classification failure, the orchestrator currently falls back to `intent: "smalltalk"`, which routes to the `content` stub — fine while `content` is still a placeholder. Once `content` becomes the real script-writing agent (phase 4, feature 11), a classification failure must no longer silently land there with no explanation. Add a proper user-facing fallback at that point (e.g. "I didn't catch that — try again") instead of relying on the smalltalk route. Not built now — recorded so it isn't forgotten.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- `server/lib/env.ts` (feature 01) originally required every token in `code-standards.md`'s env table up front, with no phased/optional mode — missing vars threw a loud, structured error listing exactly which keys were absent. **Superseded in feature 02**: only `PORT` + `MONGODB_URI` are validated at boot now; third-party/integration vars are validated lazily per-service (see Decisions above). `GET /health` still returns `{ success: true, data: { status: "ok" } }` once core validation + DB connection succeed.
- Added `server/.gitignore` — none existed, so `server/node_modules` was previously unprotected from `git add`.
- Installed for feature 01: `express`, `dotenv` (already present) + `zod` (added). The rest of the approved dependency list (`mongodb`, `@langchain/*`, `pdf-lib`, `node-cron`, `googleapis`) is intentionally not installed yet — each gets added when its feature is built, per `code-standards.md`'s "never install without a clear reason."
- Feature 02: the Atlas Vector Search index (`documents.embedding`) is created via a separate one-off setup script, not on server boot — `createSearchIndex` builds asynchronously and shouldn't gate "boot done" or block the server for a feature (contracts, #20) that isn't live yet. Standard indexes (unique/compound) still run unconditionally on every boot via `createIndex`.
- `createVectorSearchIndex()` creates the `documents` collection first if it doesn't exist yet — Atlas rejects `createSearchIndex`/`listSearchIndexes` with `NamespaceNotFound` against a collection with zero documents in it, which is the normal state until feature 18 (Document Ingest) runs. Discovered by actually running `npm run db:setup-search-index` against the real Atlas cluster before any documents existed.
- All of feature 02's MongoDB code (connect/retry, standard indexes, vector index setup, seed) was verified against the real configured Atlas cluster — not mocked — including running the seed and vector-index scripts twice each to confirm idempotency, and a full server boot + `/health` check.
- Feature 03 built: `server/src/lib/llm.ts` (Gemini client), `server/src/agents/state.ts` (`AgentState`), `server/src/agents/orchestrator.ts` (closed-set intent classification, hard-validated with a zod enum, falls back to `smalltalk` on any invalid output or LLM-call failure), five stub nodes (`trends-agent.ts`, `content-agent.ts`, `calendar-agent.ts`, `dms-agent.ts`, `contracts-agent.ts`, each returning a fixed placeholder response with no try/catch since they have no I/O yet), `server/src/agents/graph.ts` (compiled `StateGraph` wiring orchestrator → specialist via `addConditionalEdges`), and `server/src/agents/run-graph-test.ts` (`npm run graph:test` — generates a `runId` per sample input, the way the future route/webhook caller will, and invokes the compiled graph directly since no HTTP route exists until feature 04).
- Verified `npm run graph:test` against the live Gemini API (not mocked): all seven sample inputs — one per intent plus an ambiguous "good morning!" — classified correctly, including the smalltalk default routing to the content stub.
- `runId` is generated once by the caller (the test script here; the route/webhook in feature 04) and only ever read by nodes, never generated inside one — keeps every log line for a single message traceable to one id once `logAgentError` exists.
