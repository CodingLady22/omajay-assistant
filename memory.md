# Memory — Feature 21: Document Management UI

Last updated: 2026-08-23

## What was built

Feature 21 shipped via the full loop: `/architect` → build → `/review` (found 1 Critical + 1 Important + 2 Minor, all fixed and re-verified live) → ticked in `progress-tracker.md` → `/imprint` on the 3 new components. Real document upload/list/delete UI nested in the Contracts panel, replacing feature 18's script-driven mock ingest as the production path.

**Server — new:**
- `server/src/rag/parse.ts` — `extractText(buffer, filename)`: `.pdf` → `pdf-parse` (v2's class-based `new PDFParse({ data }).getText()` API, not the old v1 function signature), else UTF-8 decode. Throws `EmptyExtractionError` when extracted text is under 20 non-whitespace chars (scanned/image-only PDF guard).
- `server/src/routes/documents.ts` — `GET /`, `POST /upload`, `DELETE /:source`, mounted at `/api/documents`. Upload runs `multer` (memory storage, 10MB limit, `fileFilter` extension whitelist `.pdf`/`.txt`/`.md`) as a promise inside the route's own `try/catch` rather than as middleware — see Problems solved.

**Server — modified:**
- `server/src/rag/ingest.ts` — `listDocuments()` added: `$group`-by-`source` aggregation (a "document" is a group of `DocumentChunk` rows, no dedicated per-document record).
- `server/src/index.ts` — documents router mounted.
- `server/package.json` — `multer`, `pdf-parse` added.

**Client — new:**
- `client/src/components/common/ConfirmDialog.tsx` — reusable confirm modal, first real use of `--color-backdrop`. Generic props (`title`/`message`/`confirmLabel`/`onConfirm`/`onCancel`/`isSubmitting`/`error`) so calendar-add/DM-send-approval can reuse it later.
- `client/src/components/documents/DocumentRow.tsx`, `UploadDocumentForm.tsx`.

**Client — modified:**
- `client/src/lib/types.ts` — `DocType`, `DocumentSummary` added.
- `client/src/lib/api.ts` — `getDocuments`/`uploadDocument`/`deleteDocument` added. `uploadDocument` bypasses the shared `request()` helper (multipart needs `fetch` to set its own `Content-Type` boundary).
- `client/src/pages/ContractsPage.tsx` — restructured so "Source Documents" renders independently of the contracts list's loading/error/empty state (it previously early-returned before a second section could ever render).

**Docs updated:** `context/architecture.md` (folder tree — new files plus retroactively adding `Chip.tsx`, which was missing since feature 11), `context/code-standards.md` (`multer`/`pdf-parse` added to approved deps), `context/progress-tracker.md` (ticked, decisions + notes recorded), `context/ui-registry.md` (3 new entries).

## Decisions made

- **Real PDF support, not text-only** — her actual rate cards/contracts are PDFs; text-only would've been a demo, not a usable tool. `pdf-parse` added as the read-side pair to the existing write-only `pdf-lib`.
- **Server-side extension whitelist, not just the client's `accept=` hint** — the client attribute is advisory only; enforced via multer's `fileFilter`, which rejects before the file is even buffered.
- **multer errors handled inside the route's own `try/catch`**, not left as bare middleware — keeps every failure (size limit, extension rejection, real ingest error) on the same `{ success, error }` JSON shape as the rest of the app.
- **First real use of `--color-backdrop` for a confirm modal** — deleting a document is real, hard-to-reverse data loss (unlike `EventItem`'s Discard, which only drops an unconfirmed proposal), warranting the confirm-modal treatment the token was reserved for back in feature 04.
- **`listDocuments()` lives in `rag/ingest.ts`**, not a new file — same "reusable, exported" category as `ingestDocument`/`removeDocument`.

## Problems solved

- **Multer's own errors bypass a route's `try/catch` when used as middleware.** An 11MB upload against the 10MB limit fell through to Express's default HTML error handler and leaked a raw stack trace with real server filesystem paths — caught in `/review`. Fixed by wrapping `upload.single("file")` in a promise and `await`-ing it inside the handler.
- **An arbitrary binary decoded as "UTF-8 text" often still clears the empty-extraction guard's 20-char floor** — a `.exe` of random bytes was accepted and actually ingested as a real embedded chunk with `200 success` before the extension whitelist was added. Verified live, both before (bug present) and after (fixed, 422) the fix.
- **`pdf-parse` v2's API is class-based** (`new PDFParse({ data: buffer }).getText()`), not the `pdf(buffer).then(...)` function signature most training data / v1 docs assume — confirmed against the actually-installed package's type declarations before writing `rag/parse.ts`.

## Current state

- **Feature 21 complete, reviewed (all 4 findings fixed and re-verified live), ticked in `progress-tracker.md`, `/imprint` run.** `tsc -b --noEmit` clean on both `server/` and `client/`.
- Verified live end-to-end: real PDF + `.md` upload → ingested and listed; scanned/blank PDF → correctly 422s, not ingested; a real contract draft grounded verbatim against an uploaded PDF's figures; deleting that PDF via the confirm modal and re-drafting confirmed the deleted figures no longer surfaced and `sources` dropped the filename — **grounding verified at the retrieval level, not just the list UI**, per explicit instruction. Oversized upload and disallowed-extension upload both re-verified to return clean JSON errors after the review fixes.
- Repo state: branch `documentManagementUI`. The user committed the initial build themselves mid-session (commit `cae32db feat: build document management UI`) — my subsequent 4 review-fix changes (multer error handling + extension whitelist in `routes/documents.ts`, comment + import fix in `UploadDocumentForm.tsx`) plus all doc updates are **uncommitted**, sitting on top of that commit. I have not committed anything this session, per standing instruction to only commit when asked.
- No dev servers left running; all test artifacts (test contracts, test-uploaded documents) cleaned from the real database/GridFS afterward.

## Next session starts with

**Feature 22 — Briefing Agent + Scheduled Send**, per `build-plan.md` Phase 8: gathers today's events, unfinished script drafts, unsent contracts, unreplied brand DMs; composes a short WhatsApp-style briefing. Two things flagged in the plan to actually do this time: (1) move `getProfile()` out of `agents/trends-agent.ts` into a shared accessor now that this becomes a third consumer (deferred since feature 09's `/review`). (2) Since feature 05 (WhatsApp) is still deferred, delivery must go behind a pluggable seam (e.g. `deliverBriefing(text)`) rather than calling `sendWhatsApp` directly — sending to the dashboard/console for now, swapped to real WhatsApp once feature 05 lands. Run `/architect` first per the project's loop.

## Open questions

- Whether the uncommitted review-fix changes on `documentManagementUI` should be committed (and whether as part of the same commit or a separate one) — left to the developer, not committed by me.
- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, no action needed yet.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern (tooltip on disabled buttons) should become a deliberate app-wide decision — carried over from feature 19, still undecided.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component — carried over from feature 20, still open.
- The `<select>` in `UploadDocumentForm` deviates slightly from `ui-tokens.md`'s Input spec (padding, no focus ring) — flagged in `ui-registry.md` for whenever a real `<select>` pattern gets formalized elsewhere; not corrected in isolation this feature.
