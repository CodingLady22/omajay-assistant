# Build Plan

## Core Principle

UI built with mock data first — verified visually — before any logic is wired. Then functionality is built and connected step by step. Every feature must be visible and testable before moving on. No invisible backend-only phases.

Because WhatsApp is the primary interface, "testable" sometimes means a WhatsApp message round-trip, not just a screen. Each feature below says how to verify it.

**Mock data throughout.** Every feature is built and tested against placeholder data — sample trends, fake DMs, dummy rate cards and contracts. Real accounts and documents are connected only when the app is ready for production.

**WhatsApp is currently deferred (2026-08-03)** — feature 05 is blocked on a Meta WhatsApp Cloud API token that isn't available yet. It has been resequenced to run later, whenever the token arrives; it is not cancelled or dropped. Until it lands, **every "verify on WhatsApp" step below should be read as "verify via the dashboard chat (`POST /api/chat`)"** — both surfaces run the exact same graph, so this changes nothing about what's being tested, only which door is used to test it. See `progress-tracker.md`'s Decisions section for the full rationale.

**Phase 6 (Instagram DMs, features 15-17) is currently deferred (2026-08-19)** — blocked on Instagram credentials (`INSTAGRAM_TOKEN` / `INSTAGRAM_ACCOUNT_ID`), not yet available. Resequenced to run later, whenever the token lands; not cancelled. Because Phase 6 is self-contained and Phase 7 (Contracts) doesn't depend on it, the build proceeds straight to feature 18 next. See `progress-tracker.md`'s Decisions section for the full rationale.

**Each feature runs through the engineering loop** (see `AGENTS.md`):

```
/architect (plan the feature)  →  Build  →  /review (verify correct)  →  tick progress-tracker
            /imprint after any UI component   ·   /remember at session start + end
```

---

## Phase 1 — Foundation

### 01 Monorepo Scaffold

Set up the project shell.

**Logic:**

- Monorepo with `/server` (Node + Express + TypeScript) and `/client` (React + Vite + TypeScript).
- `tsconfig` strict in both; `@/` path alias in both.
- Tailwind v4 in `/client` with the `@theme` tokens from `ui-tokens.md` in `client/src/index.css`.
- `server/lib/env.ts` — zod-validated env loading for every variable in `code-standards.md`.
- `.env.example` listing all variables.
- `server/lib/logger.ts`, `server/lib/utils.ts`.

**Verify:** server boots, web dev server runs, env validation fails loudly on a missing var.

---

### 02 MongoDB Connection + Collections

**Logic:**

- `server/db/client.ts` — single MongoDB connection.
- `server/db/collections.ts` — typed accessors for every collection in `architecture.md`.
- `server/db/indexes.ts` — standard indexes + the Atlas Vector Search index on `documents.embedding`.
- Seed a single `profile` document (name, handle, whatsapp_number, timezone, briefing_time).

**Verify:** a small script reads the seeded profile back.

---

### 03 LLM Client + Graph Skeleton

**Logic:**

- `server/lib/llm.ts` — the one LLM client (Gemini for now).
- `server/agents/state.ts` — `AgentState`.
- `server/agents/graph.ts` — graph with orchestrator + placeholder nodes that each return a stub response.
- `server/agents/orchestrator.ts` — classifies intent into the fixed set, defaults to `smalltalk`.

**Verify:** call the compiled graph with "what's trending?" and confirm it routes to the trends node (stub reply).

---

### 04 Chat Route + Dashboard Shell

**Logic + UI:**

- `POST /api/chat` — runs the graph with `channel: "web"`, returns `{ success, data: { response } }`.
- `/client` shell: sidebar + topbar + panel switching, matching `context/designs/glam-ai.html`.
- Chat panel wired to `/api/chat` — send a message, see the stub reply.

**Verify:** type in the dashboard chat, get a routed stub reply. The shell matches the design.

---

## Phase 2 — WhatsApp (Primary Interface)

### 05 WhatsApp Webhook + Send — **DEFERRED**

**Status: blocked on a WhatsApp Cloud API token from Meta (not yet available as of 2026-08-03).** Do not build this until the token arrives — no webhook route, no `services/whatsapp.ts` send logic. Resequenced to run out of order, whenever the token lands; everything after it in this plan (06 onward) proceeds now through the dashboard instead of waiting on it.

**Logic (unchanged from original plan — build this when unblocked):**

- `GET /api/whatsapp` — Meta verification handshake.
- `POST /api/whatsapp` — verify signature, parse message, run the graph with `channel: "whatsapp"`, send the reply.
- `server/services/whatsapp.ts` — `sendWhatsApp(to, text)`.

**Verify:** message the WhatsApp number "what's trending?" and get the routed stub reply back on WhatsApp.

---

## Phase 3 — Trends

### 06 Trends Panel — Full UI (Mock)

**UI:**

- Trends grid matching the design: platform-coloured cards, badges, metric lines.
- Mock data for Instagram + YouTube cards. No TikTok cards (out of scope).
- Cards clickable — clicking sends a prompt into the chat.

**Verify:** grid renders, matches design, cards route to chat.

---

### 07 YouTube + Instagram Trend Services

**Logic:**

- `server/services/youtube.ts` — `fetchTrendingVideos(query)` — trending videos for a given topic (search by viewCount + recent window, then stats). `query` is a parameter, not hardcoded — defaults to a general makeup term only when no topic is passed; the trends-agent (feature 08) decides the topic, this service just executes the search.
- `server/services/instagram.ts` — `fetchHashtagTopPosts(hashtag)` — **stubbed, returns `[]`** (2026-08-08). Real implementation is blocked on `INSTAGRAM_TOKEN` / `INSTAGRAM_ACCOUNT_ID`, not available yet — deferred the same way feature 05 (WhatsApp) was, see `progress-tracker.md`. Stubbed like `tiktok.ts` rather than left unbuilt, so feature 08's trends-agent can loop over all three services identically today; swapping in the real Graph API call later is a one-file change here, no agent changes.
- `server/services/tiktok.ts` — `fetchTrendingVideos(query)` — stub returning `[]`, out of scope until TikTok API access. Takes the same `query` shape as `youtube.ts` (currently unused) so all three services share one call signature.

**Verify:** a script prints real trending items from YouTube for a given topic, and confirms the Instagram and TikTok stubs both return `[]`. Instagram's real verify step (real data, not just `[]`) happens once its token arrives and the stub is replaced.

---

### 08 Trends Agent + Scan + Store

**Logic:**

- `server/agents/trends-agent.ts` — decides the topic/query from her message (feature 07's services just execute a given query — this is where the topic gets picked), calls `fetchTrendingVideos`/`fetchHashtagTopPosts` from all three services, maps their raw `YouTubeTrend` / `InstagramTrend` / `TikTokTrend` shapes (`server/types/index.ts`) into the DB `Trend` shape, the LLM scores each item 0-100 for niche relevance, upserts top results into `trends` (dedupe on `external_id`).
- On-demand: returns freshest stored trends; triggers a live scan if stored data is stale.
- `GET /api/trends` — returns stored trends for the dashboard.
- Wire the dashboard grid to real data.
- **Consolidate the trend type.** Feature 06 defined a client-only `Trend` type in `client/src/lib/mock-trends.ts` for the mock UI. When wiring real data here, replace it with a single shared type sourced from/aligned with the server's `trends` collection schema (`architecture.md`) rather than letting a client-mock type and a server type drift apart independently.

**Verify:** ask "what's trending?" on WhatsApp and in the dashboard — get real, niche-relevant results.

---

### 09 Daily Trends Scan (Scheduled)

**Logic:**

- `server/jobs/daily-trends.ts` — runs the scan and stores results by calling `scanAndStoreTrends()` (exported from `agents/trends-agent.ts`, feature 08) directly — reuse it rather than duplicating scan logic.
- **`scanAndStoreTrends()` has no try/catch of its own** — feature 08 only wraps it via `trendsAgent()`'s try/catch, which this job doesn't go through. Per `library-docs.md`'s node-cron rules ("each job wraps its work in try/catch — a failed job never crashes the server"), `daily-trends.ts` must wrap its own call to `scanAndStoreTrends()`, logging and swallowing any failure rather than letting it propagate.
- Registered in `server/jobs/scheduler.ts` with node-cron at early morning, profile timezone.

**Verify:** trigger the job manually; confirm `trends` is freshly populated.

---

## Phase 4 — Content Ideas and Scripts

### 10 Scripts Panel — Full UI (Mock)

**UI:**

- Scripts library matching the design: draft cards with kind badge, structured body, action chips.
- Mock Reel script + caption cards.

**Verify:** panel renders and matches design.

---

### 11 Content Agent + Save

**Logic:**

- `server/agents/content-agent.ts` — given a trend/topic/vibe, the LLM (temp 0.7) returns a structured Reel script (hook/body/cta), caption variations, hashtags.
- Save to `scripts`; `GET/POST /api/scripts`.
- Wire the dashboard library to real data.
- **Consolidate the `Script` type.** Feature 10 defined a client-only `Script` type (discriminated union: `ReelScript`/`CaptionScript`/`CarouselScript`) in `client/src/lib/mock-scripts.ts` for the mock UI. When wiring real data here, move it into the shared `client/src/lib/types.ts` alongside `Trend` and delete the mock file — same pattern feature 08 used for trends.
- **Extract two duplicated UI patterns while these files are already being touched for real-data wiring** (flagged in feature 10's `/code-review`, deliberately deferred here rather than fixed in place to avoid churning the same files twice): (1) the chip-button className (`rounded-full border border-border px-[11px] py-1 text-[11px] text-text-secondary hover:border-pink-mid hover:bg-pink-light hover:text-pink`) is copy-pasted 4× across `QuickChips.tsx`, `TrendsPage.tsx`, `ScriptCard.tsx`, `ScriptsPage.tsx` — extract into a shared `<Chip>` component. (2) the `navigate("/", { state: { prompt } })` prefill-and-go-to-chat pattern is copy-pasted 4× across `TrendCard.tsx`, `TrendsPage.tsx`, `ScriptCard.tsx`, `ScriptsPage.tsx` — extract into a shared helper (e.g. a `useChatPrompt()` hook).

**Verify:** "write me a Reel script about glass skin" on WhatsApp returns a structured script; it appears in the dashboard library.

---

## Phase 5 — Calendar

### 12 Calendar Panel — Full UI (Mock)

**UI:**

- Month grid + event list matching the design; today highlighted, event dots.
- "Add event" chip present (no write yet).

**Verify:** panel renders and matches design.

---

### 13 Calendar Read

**Logic:**

- `server/services/google-calendar.ts` — `listUpcomingEvents`.
- `server/agents/calendar-agent.ts` — `calendar_read` intent returns upcoming events as a WhatsApp-friendly summary.
- `GET /api/calendar` — feeds the dashboard grid + list.

**Verify:** "what's on this week?" returns her real events on WhatsApp and in the dashboard.

---

### 14 Calendar Add — Propose Then Confirm

**Logic:**

- `calendar_add` intent → agent parses the event from natural language and creates a `proposed` event in `events` (NOT in Google Calendar). Replies with the proposed details and asks for confirmation.
- `POST /api/calendar/confirm` — on approval, writes to Google Calendar via `createEvent`, flips status to `confirmed`.
- Dashboard "Add event" flow uses the same propose-then-confirm path.

**Verify:** "add a shoot Monday 10am in Milan" returns a proposal; confirming writes it to Google Calendar; the event appears on next read.

---

## Phase 6 — Instagram DMs — **DEFERRED**

**Phase status: blocked on Instagram credentials (`INSTAGRAM_TOKEN` / `INSTAGRAM_ACCOUNT_ID`), not yet available as of 2026-08-19.** All three features below (15-17) are resequenced to run later, whenever the token lands — not cancelled. This phase is self-contained (DMs panel + fetch/classify + draft/approve, all Instagram-specific) and Phase 7 (Contracts) has no dependency on it, so the plan jumps straight to feature 18 next. Same deferral pattern as feature 05 (WhatsApp). `services/instagram.ts` stays on its feature-07 `[]` stub untouched — the trends scan already handles it returning empty, and nothing in Phase 6 changes that until the token arrives.

### 15 DMs Panel — Full UI (Mock)

**UI (unchanged from original plan — build this when unblocked):**

- Filtered DM list matching the design: avatar, name + classification badge, preview, timestamp, unread dot.
- Mock brand-inquiry and active-collab rows.

**Verify:** panel renders and matches design.

---

### 16 DMs Fetch + Classify + Summarise

**Logic (unchanged from original plan — build this when unblocked):**

- `server/services/instagram.ts` — `fetchRecentDms`.
- `server/agents/dms-agent.ts` — classify each DM (`brand_inquiry` / `active_collab` / `ignore`), summarise, draft a reply. Cache in `dms` (dedupe on `ig_thread_id`).
- `GET /api/dms` — relevant DMs only (not `ignore`).
- Wire dashboard list to real data.

**Verify:** "any brand DMs?" on WhatsApp returns classified, summarised brand messages with draft replies. Fan mail is filtered out.

---

### 17 DM Reply — Draft Then Approve

**Logic (unchanged from original plan — build this when unblocked):**

- Agent only ever produces `draft_reply` — it never sends.
- `POST /api/dms/send` — sends a reply to Instagram **only** with an explicit approval payload (thread id + approved text).
- Dashboard shows draft + "Approve & send" that requires confirmation.

**Verify:** approving a draft sends it to Instagram; without approval, nothing is sent.

---

## Phase 7 — Contracts (RAG)

### 18 Document Ingest + Vector Index

**Logic:**

- `server/fixtures/documents/*.md` — 2-3 dummy rate card / past contract fixture files (plain text/markdown, not PDF — avoids a PDF-text-extraction dependency during the mock phase; her real PDFs get parsed once production documents are wired in).
- `server/rag/ingest.ts` — chunk + embed a document into `documents`, exposed as **reusable exported functions** (ingest one document; remove one document's chunks) — not one-shot script-only code. Feature 21 (Document Management UI) calls these same functions directly to embed a newly uploaded document and remove a deleted one's chunks, so this can't be written as script-local logic.
- `server/rag/embeddings.ts` — embedding client, **Voyage AI** (`voyage-3`, 1024-dim — matches the `EMBEDDING_DIMENSIONS` placeholder already in `indexes.ts` from feature 02, no dimension rework needed).
- Confirm the Atlas Vector Search index from feature 02 matches embedding dimensions.
- A one-off ingest script (`npm run rag:ingest`, mirroring `trends:test`/`calendar:test`) that calls the exported ingest function against the fixture documents — this feature is verified via script + mock data only; the real upload/delete UI is feature 21.

**Verify:** run the ingest script against the fixture documents; documents are chunked, embedded, and stored; a test vector query returns relevant chunks.

---

### 19 Contracts Panel — Full UI (Mock)

**UI:**

- Contract list cards: brand, deal summary, status badge, "Download PDF", "Edit terms".
- Mock contract cards.

**Verify:** panel renders and matches design.

---

### 20 Contracts Agent — Retrieve, Draft, PDF

**Logic:**

- `server/rag/retrieve.ts` — vector search top-k chunks for the deal.
- `server/agents/contracts-agent.ts` — the LLM drafts the contract grounded ONLY in retrieved chunks (never invents rates/terms; if retrieval is empty, says so).
- `server/services/pdf.ts` — render an editable PDF with pdf-lib; store in GridFS; save to `contracts`.
- `POST /api/contracts/draft`, `GET /api/contracts`, `GET /api/contracts/:id/pdf`.
- Deliver the PDF to WhatsApp as a document; show in the dashboard.
- **Distinguish "no results" from "index missing."** Recorded during feature 18's `/review` (2026-08-22): that feature discovered the Atlas Vector Search index can silently disappear (shared-tier cluster pause/resume drops Search indexes without touching the underlying data — see `progress-tracker.md`'s Decisions). If `rag/retrieve.ts`'s `$vectorSearch` call returns zero results across the board, `contracts-agent.ts` shouldn't just say "nothing on file" as if retrieval genuinely found no match — it should fail with an explicit hint (e.g. "no results — vector index may be missing, run `db:setup-search-index`"), since the two situations are otherwise indistinguishable and a dropped index would silently look identical to an honest empty-retrieval case.

**Verify:** "draft a contract for the Velour summer deal" retrieves her real rates, drafts grounded terms, and returns an editable PDF on WhatsApp and in the dashboard.

---

### 21 Document Management UI

**UI + Logic:**

- New document-management UI — nested in the Contracts panel, since these are the source documents that ground contract drafts — letting her upload, list, and delete her own rate cards and past contracts. Replaces feature 18's script-driven mock ingest as the real, production way documents get into `documents`.
- Upload calls `rag/ingest.ts`'s exported ingest function (built in feature 18) directly to chunk, embed, and store the new document.
- Delete calls `rag/ingest.ts`'s exported removal function (also built in feature 18) to remove that document's chunks from `documents`.
- List shows her uploaded documents (type, source/name, upload date).

**Verify:** upload a real document through the UI and confirm a contract draft can retrieve from it; delete it and confirm its chunks are gone from `documents` and no longer retrievable.

**Placed after feature 20, not next to feature 18 (2026-08-22, developer decision).** RAG is validated end-to-end with script-uploaded mock documents first (features 18-20), so the ingest pipeline, retrieval, and the contracts agent are all proven working before the upload UI exists — she needs this UI before real-world use, not before the agent itself works. Keeping it as its own feature (rather than folding into 18) also respects "one thing at a time": 18 is backend ingest + vector index only, this is its own frontend + routes concern with its own panel, components, and verify step.

---

## Phase 8 — Morning Briefing (Autonomous)

### 22 Briefing Agent + Scheduled Send

**Logic:**

- `server/agents/briefing-agent.ts` — gathers today's events, unfinished script drafts, unsent contracts, and unreplied brand DMs; the LLM composes a short briefing that asks the plan for the day and reminds about unfinished projects.
- **Move `getProfile()` out of `agents/trends-agent.ts`.** Deferred from feature 09's `/review` (recorded in `progress-tracker.md`): `getProfile()` is generic profile-fetch logic that only lives in `trends-agent.ts` because that's where it was first needed. This feature makes it a third consumer (after `trends-agent.ts` itself and `jobs/scheduler.ts`) — move it into a small shared accessor (e.g. `db/profile.ts`) and update all three call sites, rather than adding a fourth reach-into-trends-agent import.
- `server/jobs/morning-briefing.ts` — runs the agent and sends via WhatsApp at `profile.briefing_time`.
- Register in `scheduler.ts`.
- Log each briefing (and her reply, captured by the normal webhook) to `briefings`.

**Delivery is pluggable (recorded 2026-08-03, given WhatsApp/feature 05 is deferred).** Build the briefing agent itself in full — gathering + composing the text — but keep delivery behind a single seam (e.g. a `deliverBriefing(text)` function `morning-briefing.ts` calls) rather than calling `sendWhatsApp` directly. Until feature 05 lands, that seam sends the briefing to the dashboard/console (e.g. logged + surfaced in the UI or written to `briefings` for the dashboard to display) instead of WhatsApp. Once WhatsApp is built, swap the seam's implementation to `sendWhatsApp` — no change to the agent or the gathering logic. This is a note for when feature 22 is actually built, not something to build now.

**Verify:** trigger the job manually; receive a real, accurate briefing (via the dashboard/console delivery seam, or WhatsApp once 05 is done) that names today's events and actual unfinished items.

---

## Phase 9 — Settings + Polish

### 23 Settings Panel

**UI + Logic:**

- WhatsApp briefing settings (time, which reminders on/off) — persisted to `profile`.
- Connected-accounts status: Instagram, YouTube, Google Calendar, WhatsApp.

**Verify:** changing briefing time updates `profile` and the schedule respects it.

---

### 24 Empty States + Error Handling Pass

**Logic:**

- Every panel has an empty state.
- Every agent degrades gracefully on a failed third-party call with a friendly message.
- Confirm all safety gates: DM send and calendar add both require explicit approval; briefing is the only autonomous outbound.

**Verify:** disconnect a service and confirm friendly degradation, not a crash.

---

## Feature Count

| Phase                       | Features |
| --------------------------- | -------- |
| Phase 1 — Foundation        | 4        |
| Phase 2 — WhatsApp          | 1        |
| Phase 3 — Trends            | 4        |
| Phase 4 — Content           | 2        |
| Phase 5 — Calendar          | 3        |
| Phase 6 — DMs               | 3        |
| Phase 7 — Contracts (RAG)   | 4        |
| Phase 8 — Morning Briefing  | 1        |
| Phase 9 — Settings + Polish | 2        |
| **Total**                   | **24**   |
