# Memory — Feature 20: Contracts Agent (Retrieve, Draft, PDF)

Last updated: 2026-08-23

## What was built

Feature 20 shipped via the full loop: `/architect` → build → `/review` (0 blocking issues) → ticked in `progress-tracker.md` → `/imprint` on `ContractCard`. Full RAG-grounded contract drafting pipeline, real data replacing feature 19's mock UI.

**Server — new:**
- `server/src/rag/retrieve.ts` — `retrieveContext(query, k)`, returns `{status: "ok", chunks, sources} | {status: "empty"} | {status: "index_missing"}`. Includes a relevance-floor filter (`MIN_RELEVANCE_SCORE = 0.6`) and an Atlas index-existence check to distinguish the two empty states.
- `server/src/db/gridfs.ts` — `uploadPdf`/`downloadPdf`/`deletePdf`, GridFS bucket `contract_pdfs`.
- `server/src/services/pdf.ts` — `renderContractPdf(contract): Promise<Buffer>` via pdf-lib, pure rendering, no I/O.
- `server/src/routes/contracts.ts` — `POST /draft`, `GET /`, `GET /:id/pdf`, mounted in `index.ts`.
- `server/src/agents/run-contracts-test.ts` — permanent live-verify script (`npm run contracts:test`).

**Server — modified:**
- `server/src/types/index.ts` — `ContractDoc.terms` retyped from `Record<string, unknown>` to structured `ContractTerms` (`ContractDeliverable[]` + 6 nullable term fields).
- `server/src/agents/contracts-agent.ts` — full rewrite: `extractDealDetails`, `draftTerms`, `draftContract` (shared by chat + direct route), `getStoredContracts`, `getContractPdf`, `contractsAgent`.
- `server/src/index.ts` — contracts router mounted.
- `server/package.json` — `pdf-lib` dependency added, `contracts:test` script added.

**Client — modified:**
- `client/src/lib/types.ts` — `ContractStatus`/`ContractDeliverable`/`ContractTerms`/`Contract` added.
- `client/src/lib/api.ts` — `getContracts()` added, `API_BASE_URL` exported (needed by `ContractCard`'s real download link).
- `client/src/components/contracts/ContractCard.tsx` — reads real fields (`deal_summary` not `dealSummary`), "Download PDF" un-disabled into a real `<a href="/api/contracts/:id/pdf">`, "Edit terms" prompt now derived from `contract.brand`.
- `client/src/pages/ContractsPage.tsx` — rewritten for real fetch with loading/error/empty states (matches `TrendsPage.tsx`'s pattern).

**Client — deleted:**
- `client/src/lib/mock-contracts.ts`

**Docs updated:** `context/architecture.md` (`contracts` schema section + `ContractTerms` shape, `db/gridfs.ts` added to folder tree), `context/progress-tracker.md` (ticked, decisions + notes recorded), `context/ui-registry.md` (`ContractCard` entry updated for the new download-link pattern).

## Decisions made

- **Relevance floor added to retrieval (not in the original plan)** — `$vectorSearch` has no built-in cutoff, so a zero-hit check alone never fires "empty" once any documents exist. Measured live: a genuine deal query scored 0.82/0.71/0.67 across the 3 fixture docs; a domain-unrelated query scored only 0.58/0.58/0.57. `MIN_RELEVANCE_SCORE = 0.6` sits cleanly in that gap.
- **Confirmed live that `$vectorSearch` against a nonexistent index name returns `[]`, not a throw** — this is what makes the `index_missing` branch actually reachable in the real failure case, not just theoretical.
- **Draft prompt explicitly forbids cross-brand contamination** — a past contract chunk's figures are only used if its stated brand matches the brand asked about; the general rate card (no brand attached) applies to any brand.
- **Grounding is enforced per-field, not per-draft** — every `ContractTerms` field is independently nullable; the PDF renders each null as "Not on file...". Verified live: the real Velour draft correctly left itemized deliverable rates null (the real past contract only stated one flat total) while still populating `totalFee`.
- **No approval gate for contract drafting** — confirmed during `/architect`: the hard safety rule only requires grounding, not human sign-off before a draft exists. Every contract is created `status: "draft"`.
- **`POST /api/contracts/draft` and the chat path share one `draftContract()` function**, extraction only happens on the chat path — same relationship `calendar-agent.ts`'s `proposeEvent`/`confirmProposedEvent` have.
- **WhatsApp delivery still skipped** (feature 05 not built) — PDF served only via the dashboard route, same standing deferral since feature 06.

## Problems solved

- Initial `MIN_RELEVANCE_SCORE = 0.5` guess was wrong — a live test with an aerospace-industry query still scored 0.58 against the beauty-contract fixtures (all short business documents share baseline vocabulary similarity). Measured real scores for both a relevant and an irrelevant query before picking 0.6, rather than guessing a threshold and hoping.
- An early failed test run (before the threshold fix) left a stray "Orbital Dynamics Aerospace" contract + GridFS file in the real database, because that test's cleanup only ran in a path that was never reached. Found and deleted manually before final verification; the test script itself doesn't have this gap since `testGroundedDraft`'s cleanup is now provably reached in all cases.
- TypeScript build errors from a mongodb driver version mismatch: `GridFSBucketWriteStreamOptions` doesn't have a top-level `contentType` (moved to `metadata.contentType`); `ListSearchIndexesCursor` is typed as only `{name: string}` even though Atlas actually returns `queryable` too — worked around with a documented type assertion (`SearchIndexStatus`), not a runtime-unsafe guess.
- Caught during self-review (before the formal `/review` pass) that I'd verified `draftContract()` directly and via chat, but never actually hit the `POST /api/contracts/draft` HTTP route itself — closed that gap live before reporting the review as complete.

## Current state

- **Feature 20 complete, reviewed (0 blocking issues), ticked in `progress-tracker.md`, `/imprint` run.** `tsc -b --noEmit` clean on both `server/` and `client/`.
- Verified live end-to-end: `npm run contracts:test` (grounding matches the real fixture **verbatim** on every field, empty-retrieval correctly detected for an unrelated brand), a real chat round-trip, the direct `POST /api/contracts/draft` route (both a validation failure and a valid structured draft), `GET /api/contracts`, `GET /api/contracts/:id/pdf` (real PDF bytes, correct headers), and a Playwright pass on the real `/contracts` dashboard (zero console errors).
- One legitimate "Velour Cosmetics" contract (created via a realistic chat-path test) was intentionally left in the real database as real usage data — same precedent feature 11 set for keeping real generated scripts. All other test artifacts were cleaned up.
- One informational-only note from `/review`: `ContractCard.tsx`'s real download link duplicates `Chip`'s className as a literal string (documented in `ui-registry.md` as a candidate for future extraction, not urgent).
- Repo state: branch `contractsAgent`. Nothing committed by me this session — developer commits their own work, per established pattern.
- No dev servers left running (both server and client dev servers, and the Playwright driver, were stopped after verification).

## Next session starts with

**Feature 21 — Document Management UI**, per `build-plan.md` Phase 7: upload/list/delete UI nested in the Contracts panel, calling `rag/ingest.ts`'s already-exported `ingestDocument`/`removeDocument` functions (built in feature 18) directly. This is the point where her real rate cards/contracts replace the script-driven mock fixtures as the production ingestion path. Run `/architect` first per the project's loop.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index *proactively* (vs. reactively at query time, which feature 20 now does) — carried over from feature 18, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over from prior sessions, no action needed yet.
- Whether the dev/test Google Calendar (service-account-owned "tester" calendar) gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern (tooltip on disabled buttons) should become a deliberate app-wide decision later — carried over from feature 19, still undecided.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component now, or wait for a third occurrence (feature 11's precedent threshold) — raised during this feature's `/review`, deliberately left open.
