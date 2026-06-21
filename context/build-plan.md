# Build Plan

## Core Principle

UI built with mock data first — verified visually — before any logic is wired. Then functionality is built and connected step by step. Every feature must be visible and testable before moving on. No invisible backend-only phases.

Because WhatsApp is the primary interface, "testable" sometimes means a WhatsApp message round-trip, not just a screen. Each feature below says how to verify it.

**Mock data throughout.** Every feature is built and tested against placeholder data — sample trends, fake DMs, dummy rate cards and contracts. Real accounts and documents are connected only when the app is ready for production.

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

### 05 WhatsApp Webhook + Send

**Logic:**

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

- `server/services/youtube.ts` — trending makeup videos (search by viewCount + recent window, then stats).
- `server/services/instagram.ts` — hashtag top posts for her niche tags.
- `server/services/tiktok.ts` — stub returning `[]`.

**Verify:** a script prints real trending items from YouTube and Instagram.

---

### 08 Trends Agent + Scan + Store

**Logic:**

- `server/agents/trends-agent.ts` — pulls from the services, the LLM scores each item 0-100 for niche relevance, upserts top results into `trends` (dedupe on `external_id`).
- On-demand: returns freshest stored trends; triggers a live scan if stored data is stale.
- `GET /api/trends` — returns stored trends for the dashboard.
- Wire the dashboard grid to real data.

**Verify:** ask "what's trending?" on WhatsApp and in the dashboard — get real, niche-relevant results.

---

### 09 Daily Trends Scan (Scheduled)

**Logic:**

- `server/jobs/daily-trends.ts` — runs the scan and stores results.
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

## Phase 6 — Instagram DMs

### 15 DMs Panel — Full UI (Mock)

**UI:**

- Filtered DM list matching the design: avatar, name + classification badge, preview, timestamp, unread dot.
- Mock brand-inquiry and active-collab rows.

**Verify:** panel renders and matches design.

---

### 16 DMs Fetch + Classify + Summarise

**Logic:**

- `server/services/instagram.ts` — `fetchRecentDms`.
- `server/agents/dms-agent.ts` — classify each DM (`brand_inquiry` / `active_collab` / `ignore`), summarise, draft a reply. Cache in `dms` (dedupe on `ig_thread_id`).
- `GET /api/dms` — relevant DMs only (not `ignore`).
- Wire dashboard list to real data.

**Verify:** "any brand DMs?" on WhatsApp returns classified, summarised brand messages with draft replies. Fan mail is filtered out.

---

### 17 DM Reply — Draft Then Approve

**Logic:**

- Agent only ever produces `draft_reply` — it never sends.
- `POST /api/dms/send` — sends a reply to Instagram **only** with an explicit approval payload (thread id + approved text).
- Dashboard shows draft + "Approve & send" that requires confirmation.

**Verify:** approving a draft sends it to Instagram; without approval, nothing is sent.

---

## Phase 7 — Contracts (RAG)

### 18 Document Ingest + Vector Index

**Logic:**

- `server/rag/ingest.ts` — chunk + embed her rate cards and old contracts into `documents`.
- `server/rag/embeddings.ts` — embedding client.
- Confirm the Atlas Vector Search index from feature 02 matches embedding dimensions.
- An ingest script/endpoint to load her documents.

**Verify:** documents are chunked, embedded, and stored; a test vector query returns relevant chunks.

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

**Verify:** "draft a contract for the Velour summer deal" retrieves her real rates, drafts grounded terms, and returns an editable PDF on WhatsApp and in the dashboard.

---

## Phase 8 — Morning Briefing (Autonomous)

### 21 Briefing Agent + Scheduled Send

**Logic:**

- `server/agents/briefing-agent.ts` — gathers today's events, unfinished script drafts, unsent contracts, and unreplied brand DMs; the LLM composes a short briefing that asks the plan for the day and reminds about unfinished projects.
- `server/jobs/morning-briefing.ts` — runs the agent and sends via WhatsApp at `profile.briefing_time`.
- Register in `scheduler.ts`.
- Log each briefing (and her reply, captured by the normal webhook) to `briefings`.

**Verify:** trigger the job manually; receive a real, accurate briefing on WhatsApp that names today's events and actual unfinished items.

---

## Phase 9 — Settings + Polish

### 22 Settings Panel

**UI + Logic:**

- WhatsApp briefing settings (time, which reminders on/off) — persisted to `profile`.
- Connected-accounts status: Instagram, YouTube, Google Calendar, WhatsApp.

**Verify:** changing briefing time updates `profile` and the schedule respects it.

---

### 23 Empty States + Error Handling Pass

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
| Phase 7 — Contracts (RAG)   | 3        |
| Phase 8 — Morning Briefing  | 1        |
| Phase 9 — Settings + Polish | 2        |
| **Total**                   | **23**   |
