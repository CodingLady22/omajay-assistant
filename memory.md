# Memory — Feature 02: MongoDB Connection + Collections (+ LLM provider decision)

Last updated: 2026-06-21

## What was built

- **Feature 02, fully built and reviewed:**
  - `server/src/types/index.ts` — typed document shapes for all 10 collections in `architecture.md` (`Profile`, `Trend`, `ScriptDoc`, `Dm`, `EventDoc`, `DocumentChunk`, `ContractDoc`, `Briefing`, `AgentRun`, `AgentLog`). `_id` is optional on every type (required to satisfy the driver's `OptionalUnlessRequiredId` insert typing).
  - `server/src/db/client.ts` — connection singleton. `connectToDatabase()` retries up to 5 times (~2s apart, each attempt logged, failed clients closed before retrying) then throws. `getDb()` throws if called before connecting. `closeDatabaseConnection()` for shutdown.
  - `server/src/db/collections.ts` — typed accessor per collection.
  - `server/src/db/indexes.ts` — `createStandardIndexes()` (unique `trends.external_id`, unique `dms.ig_thread_id`, `events.start`, compound `contracts.{brand,status}`) runs on every boot. `createVectorSearchIndex()` is kept OUT of the boot path, existence-checked via `listSearchIndexes`, auto-creates the `documents` collection first if missing. `EMBEDDING_DIMENSIONS` (currently `1024`) is a named, exported, commented-as-provisional constant — update it when feature 18 picks the real embedding model.
  - `server/src/db/seed.ts` + `run-seed.ts` — idempotent seed of one `profile` doc for Sofia Caruso.
  - `server/src/db/run-setup-search-index.ts` — CLI entrypoint for the vector index script.
  - `server/src/index.ts` — boot sequence is connect → standard indexes → `app.listen`; added `SIGINT`/`SIGTERM` handlers that close the DB connection before exiting.
  - `server/src/lib/env.ts` — restructured from one all-or-nothing eager schema into eager **core** (`PORT`, `MONGODB_URI`) + lazy per-service getters (`getLlmEnv`, `getWhatsAppEnv`, `getInstagramEnv`, `getYouTubeEnv`, `getGoogleCalendarEnv`, `getEmbeddingEnv`), each validated and memoized on first call.
  - `server/src/lib/utils.ts` — added `sleep(ms)`.
  - `server/package.json` — added `mongodb` dependency; added `db:seed` and `db:setup-search-index` scripts.
  - `server/.env.example` — `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`.

- **LLM provider switched to Gemini** (client confirmed: free tier for dev/test; Anthropic + OpenAI to be added as production fallback later, preference TBD). Updated `AGENTS.md`, `context/architecture.md`, `context/code-standards.md`, `context/library-docs.md`, `context/build-plan.md`, `context/progress-tracker.md` to say Gemini/`@langchain/google-genai`/`GEMINI_API_KEY` everywhere instead of Claude/Anthropic, including a forward note in each to use LangChain's `.withFallbacks()` when Anthropic/OpenAI are added. **`server/src/lib/llm.ts` itself does NOT exist yet** — that's feature 03.

- **`AGENTS.md` corrected**: the five skills (`architect`, `remember`, `review`, `imprint`, `recover`) are plain files at `.agents/skills/<name>/SKILL.md` in this harness, not registered slash commands — AGENTS.md previously described them as `/architect` etc., which doesn't work here.

## Decisions made

- DB connection: connect once at startup, fail-fast, bounded retry (5×, ~2s apart, logged) on the initial connect only — no retry afterward, the driver's own pool handles reconnection.
- Index strategy split: standard indexes are cheap/idempotent and run on every boot; the vector search index is deliberately excluded from boot (Atlas's `createSearchIndex` builds asynchronously and shouldn't gate "boot done" for a feature, contracts/#20, that isn't built yet) — it's a separate, existence-checked script instead.
- GridFS is explicitly out of scope for feature 02 — deferred to feature 20, per "build only what the feature needs."
- `env.ts`: a feature's credentials should only be required once that feature is actually built, not all up front — hence core vs. lazy-per-service validation.
- LLM: Gemini now, Anthropic + OpenAI as fallback (not replacement) before production, client preference undecided — `lib/llm.ts` must stay the only file that knows which provider is active; no agent file may import a provider SDK directly.

## Problems solved

- MongoDB driver's `OptionalUnlessRequiredId<TSchema>` only relaxes `_id` to optional-on-insert if the schema itself declares `_id?: ObjectId` — declaring it required broke `insertOne` typing. Fixed by making `_id` optional on every document type.
- `createVectorSearchIndex()` failed with `NamespaceNotFound` because the `documents` collection doesn't exist until feature 18 ingests something — fixed by creating the collection first if missing.
- `env.ts`'s old all-or-nothing eager validation blocked verifying feature 02 in isolation (every third-party key had to exist just to boot) — restructuring into core+lazy also surfaced and resolved the stale `ANTHROPIC_API_KEY`-vs-`GEMINI_API_KEY` naming conflict in the docs.
- Windows/Git Bash can't reliably deliver a real `SIGINT` cross-process (`process.kill(pid, 'SIGINT')` on Windows generally does a hard `TerminateProcess` instead) — couldn't directly verify the new graceful-shutdown handler end-to-end in this sandbox. The code is the standard Node.js idiom and `closeDatabaseConnection()` itself is already proven (used successfully by `run-seed.ts`/`run-setup-search-index.ts`); this is a tooling limitation, not a known defect.
- `npx tsc` can resolve to a bogus stub package instead of the local TypeScript install depending on cwd — use `./node_modules/.bin/tsc` directly from `server/` instead.

## Current state

- Features 01 and 02 are both complete and ticked off in `context/progress-tracker.md`. Feature 02 went through the `review` skill (2 minor issues found — no client cleanup on retry, no graceful shutdown — both fixed and re-verified).
- Everything was verified against the real configured Atlas cluster, not mocked: connect+retry, standard indexes (idempotent across repeat boots), vector-index setup script (idempotent across repeat runs), seed script (idempotent across repeat runs), full server boot + `GET /health`.
- The LLM provider decision (Gemini now, Anthropic/OpenAI fallback later) is settled and propagated across every context doc, but no LLM code exists yet.
- Nothing is committed to git this session — `git status` shows everything as unstaged modifications/untracked (`AGENTS.md`, all touched `context/*.md`, `server/.env.example`, `server/package.json`/`package-lock.json`, `server/src/index.ts`, `server/src/lib/env.ts`, `server/src/lib/utils.ts` modified; `server/src/db/`, `server/src/types/` untracked).

## Next session starts with

Feature 03 — LLM Client + Graph Skeleton: `server/lib/llm.ts` (Gemini via `@langchain/google-genai`, one provider-agnostic export — install the package first, it isn't in yet), `server/agents/state.ts` (`AgentState`), `server/agents/graph.ts` (orchestrator + placeholder nodes returning stub responses), `server/agents/orchestrator.ts` (intent classification into the fixed set, defaults to `smalltalk`). Read `.agents/skills/architect/SKILL.md` and run that process manually first, per the engineering loop — it is not a slash command in this harness.

## Open questions

- Nothing blocking feature 03. Worth checking with the user whether to commit features 01+02 as a checkpoint before starting feature 03 — nothing has been committed yet across either session.
