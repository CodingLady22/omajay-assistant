# Memory — Feature 18: Document Ingest + Vector Index (+ Phase 6 deferral, new Feature 21)

Last updated: 2026-08-22

## What was built

**Three things this session, in order: (1) Phase 6 deferred, (2) a new Feature 21 added to the plan, (3) Feature 18 built via `/architect` → build → `/review` (0 blocking issues) → tick progress-tracker.**

**1. Phase 6 (Instagram DMs, features 15-17) deferred.** No Instagram credentials available. Marked `**DEFERRED**` in `build-plan.md` and `progress-tracker.md`, same pattern as feature 05 (WhatsApp) — resequenced, not cancelled. `services/instagram.ts` untouched (already a `[]` stub from feature 07). Plan jumps from 14 straight to 18 since Phase 7 (Contracts) has no dependency on Phase 6.

**2. New feature added: 21 Document Management UI**, placed after feature 20 in `build-plan.md`. Lets Sofia upload/list/delete her own rate cards + contracts via the dashboard, replacing feature 18's script-driven mock ingest for real use. This pushed every feature after the old 21 up by one: old 21 (Briefing) → 22, old 22 (Settings) → 23, old 23 (Empty States) → 24. All cross-references across `build-plan.md`, `progress-tracker.md`, and `ui-registry.md` updated to match.

**3. Feature 18 shipped.** RAG ingest pipeline: mock fixture documents get chunked, embedded via Voyage AI, and stored in `documents` behind the Atlas Vector Search index. No client-side work this feature (backend/script-verified only).

- `server/fixtures/documents/rate-card.md`, `contract-velour.md`, `contract-glosswear.md` — new, dummy mock documents (plain markdown), per `AGENTS.md`'s mock-data rule.
- `server/src/rag/embeddings.ts` — new. `embedDocuments()`/`embedQuery()` via Voyage AI (`voyage-3`, 1024-dim), called by plain `fetch` (no new SDK dependency). Throws on failure (does not degrade) except for 429s, which retry with backoff.
- `server/src/rag/ingest.ts` — new. `chunkText()` (paragraph-aware, ~375-word/~500-token chunks), `ingestDocument()` and `removeDocument()` — both exported and reusable, idempotent (`ingestDocument` removes existing chunks for that `source` before inserting).
- `server/src/rag/run-ingest.ts` — new. `npm run rag:ingest` — ingests the 3 fixtures, then runs a retrieval check that asserts the **topically correct** chunk comes back top-1 (not just a non-empty result).
- `server/package.json` — `rag:ingest` script added.
- `server/src/db/indexes.ts` — comment updated only (`EMBEDDING_DIMENSIONS = 1024` confirmed correct for `voyage-3`, no value change).
- `server/src/lib/logger.ts` — `serializeMeta()` added (out-of-plan fix, disclosed in `/review`, developer confirmed keeping it).
- `context/build-plan.md`, `context/progress-tracker.md` — feature 18 ticked, full decisions trail recorded, feature 20's entry got a new follow-up note (see below).

## Decisions made

- **Embedding provider: Voyage AI, not Gemini.** MongoDB acquired Voyage AI in 2025 (now Atlas's recommended `$vectorSearch` pairing); `rag/embeddings.ts` was already architected as its own client separate from `lib/llm.ts`'s provider-swap seam; `voyage-3`'s 1024-dim output exactly matches the placeholder already in `indexes.ts` — no dimension rework. Key is in `server/.env` as `EMBEDDING_API_KEY` (existing generic var name from feature 02, no plumbing changes needed).
- **Mock fixtures, not real documents**, per `AGENTS.md`'s mock-data-until-production rule — same treatment every other feature got. Plain markdown, not PDF, to avoid adding a PDF-text-extraction dependency this phase (`pdf-lib` only creates PDFs, doesn't parse them).
- **Ingest triggered by script** (`npm run rag:ingest`), not an endpoint — no upload UI exists yet (that's feature 21).
- **`rag/ingest.ts` exports reusable functions, not script-local logic** — explicit developer requirement, since feature 21's future upload/delete routes must call `ingestDocument()`/`removeDocument()` directly.
- **`rag/retrieve.ts` intentionally NOT built this feature** — scoped to feature 20 per `architecture.md`. The verify step runs one inline `$vectorSearch` query in the script instead of a reusable module.
- **Verify step must assert topical correctness, not just non-emptiness** — explicit developer requirement. `run-ingest.ts` asserts a rates query returns the rate-card chunk as the #1 result, not just that `$vectorSearch` returned *something*.
- **New feature 21 sequencing: after 20, not right after 18.** RAG (ingest → retrieve → draft) gets fully validated with script-uploaded mock docs first; she needs the upload UI before real-world use, not before the agent works.
- **Feature 20 follow-up recorded (not built):** when a `$vectorSearch` call returns zero results across the board, the contracts agent should fail with an explicit "vector index may be missing, run `db:setup-search-index`" hint rather than a plain "nothing on file" — because a dropped index and a genuine empty match are otherwise indistinguishable. Noted directly on feature 20's `build-plan.md` entry.

## Problems solved

- **Voyage AI 429 rate limiting (3 RPM on accounts with no payment method on file).** A single ingest run (3 docs) + 1 verify query = 4 calls, always tripping the cap on the 4th. Fixed with retry-with-backoff in `embed()` (honors `Retry-After` header when sent, else 20s default); tuned from 3→5 max retries after live testing showed 3×20s (60s) wasn't reliably enough headroom against a fresh 60s window immediately following 3 back-to-back calls.
- **The Atlas Vector Search index from feature 02 had silently disappeared** (`listSearchIndexes()` returned `[]`). Developer's diagnosis, fits the evidence exactly: Atlas shared-tier clusters auto-pause after ~60 days idle; data and normal indexes survive a pause/resume, but Search/Vector Search indexes run on a separate search-node process and can fail to come back. Benign — recovered by re-running the already-idempotent `npm run db:setup-search-index` (feature 02, deliberately kept out of the boot path for exactly this kind of recovery), then polling `listSearchIndexes()` until `queryable: true`. No code change needed for this specific incident; the feature-20 follow-up above exists so a *future* silent recurrence surfaces clearly instead of masquerading as "no matching documents."
- **`logger.ts`'s `JSON.stringify(someError)` silently produces `"{}"`** (Error's `message`/`stack` are non-enumerable own properties) — this masked the real cause of two consecutive ingest-script failures (the 429, then the missing index) until diagnosed via an ad hoc script that bypassed the logger entirely. Fixed with a `serializeMeta()` helper that special-cases `Error` instances. Affects every feature's error logging going forward — disclosed in `/review` as an out-of-plan change; developer reviewed and confirmed keeping it.
- **`run-ingest.ts`'s original `main()` only closed the DB connection on success**, leaving the process hanging forever on any error (a genuine `.catch()`-without-`.finally()` bug, caught while debugging the above). Fixed to match the established `.catch().finally(() => closeDatabaseConnection())` pattern already used in `run-daily-trends-test.ts`.

## Current state

- **Feature 18 complete, reviewed (0 blocking issues), ticked in `progress-tracker.md`.** `tsc -b --noEmit` clean on `server/` throughout, including after all fix passes.
- Verified live against the real stack, not mocked: `npm run rag:ingest` run twice — first run ingested all 3 fixtures and the retrieval check correctly returned `rate-card.md` top-1 (score 0.799 vs. 0.71/0.69 for the two contracts) for a rates question, proving topical correctness; second run confirmed idempotency (chunk count stayed at 3, not 6).
- Phase 6 (features 15-17) deferred in the plan; Phase 7 in progress (18 done, 19/20/21 pending); Phase 8 (Briefing, was 21) and Phase 9 (Settings/Empty States, was 22/23) renumbered to 22/23/24.
- **Repo state:** branch `vectorIndex` (per git status at session start), off `main`. Nothing committed by me this session — developer commits their own work, per established pattern.
- No dev servers were running this session (backend-script-only feature); nothing to stop.

## Next session starts with

**Feature 19 — Contracts Panel (Full UI, Mock)**, per `build-plan.md` Phase 7: contract list cards (brand, deal summary, status badge, "Download PDF", "Edit terms"), mock contract cards, no backend work yet. Run `/architect` first per the project's loop.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively (e.g. a boot-time or scheduled check) rather than only discovering it when a feature happens to query it — not raised as a requirement yet, just worth considering given it already happened once.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over from prior sessions, no action needed yet.
- Whether the dev/test Google Calendar (service-account-owned "tester" calendar) gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.

---

## PR Summary — Feature 18: Document Ingest + Vector Index

**What this PR does:** Builds the RAG ingest pipeline that feeds the contracts agent (feature 20). Three dummy fixture documents (a rate card, two past contracts) get chunked, embedded via Voyage AI (`voyage-3`), and stored in the `documents` collection behind Atlas Vector Search. Ingest logic ships as reusable exported functions (`ingestDocument`/`removeDocument`), not script-only code, so the future document-upload UI (new feature 21) can call them directly for real uploads/deletes. Verified via a live script that asserts retrieval is topically correct (a rates question returns the rate-card chunk top-1), not merely non-empty. No client-side changes — this feature is backend/script-verified only.

**Also included:** a small `lib/logger.ts` fix (Error objects were logging as `"{}"`, masking two real failures during this feature's own debugging) and a note on feature 20's plan entry to handle a missing vector index explicitly rather than let it masquerade as "no matching documents."

**Major changes:**
- `rag/embeddings.ts`: new Voyage AI client, called via plain `fetch` (no new dependency). Retries on 429 with backoff (honors `Retry-After`, defaults 20s, up to 5 attempts) — live-tuned against Voyage's 3 RPM free-tier cap. Throws (does not degrade) on any other failure, since a silently-dropped embedding would corrupt retrieval with no signal.
- `rag/ingest.ts`: new. Paragraph-aware chunking (~500-token target), idempotent per-document ingest (removes existing chunks for a source before re-inserting), exported chunk-removal for deletes.
- `rag/run-ingest.ts`: new verification script (`npm run rag:ingest`) — ingests the fixtures then runs a correctness-asserting `$vectorSearch` query.
- `lib/logger.ts`: `serializeMeta()` — Error instances now log their `name`/`message`/`stack` instead of silently serializing to `{}`.
- `db/indexes.ts`: comment-only update confirming `EMBEDDING_DIMENSIONS = 1024` is correct for the chosen model.

**Notable operational finding (no code change required):** the Atlas Vector Search index created in feature 02 had silently disappeared — consistent with an Atlas shared-tier cluster pause/resume cycle (data and normal indexes survive; Search indexes can fail to come back). Recovered via the existing `npm run db:setup-search-index`. Feature 20 will add explicit detection so this doesn't silently look like "no matching documents" in production.

**Files changed:**

*server/*
- `server/src/rag/embeddings.ts` (new)
- `server/src/rag/ingest.ts` (new)
- `server/src/rag/run-ingest.ts` (new)
- `server/fixtures/documents/rate-card.md` (new)
- `server/fixtures/documents/contract-velour.md` (new)
- `server/fixtures/documents/contract-glosswear.md` (new)
- `server/src/lib/logger.ts` (modified — `serializeMeta()` added)
- `server/src/db/indexes.ts` (modified — comment only)
- `server/package.json` (modified — `rag:ingest` script added)

*client/*
- No changes this feature.
