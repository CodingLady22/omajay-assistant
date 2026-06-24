# Architecture

## Stack

| Layer             | Tool                                  | Purpose                                            |
| ----------------- | ------------------------------------- | -------------------------------------------------- |
| Frontend          | React 19 + Vite + TypeScript          | Secondary web dashboard                            |
| Styling           | Tailwind CSS v4                       | UI styling via `@theme` tokens                     |
| Backend           | Node.js + Express + TypeScript        | REST API server                                    |
| Agent framework   | LangGraph.js + LangChain.js           | Multi-agent orchestration                          |
| LLM               | Gemini via `@langchain/google`        | Routing, scripts, summaries, contract drafting     |
| Database          | MongoDB                               | All data — documents, state, cache                 |
| Vector search     | MongoDB Atlas Vector Search           | RAG over rate cards + old contracts                |
| Messaging         | WhatsApp Cloud API (Meta)             | Primary interface — send + receive                 |
| Instagram         | Instagram Graph API                   | DMs + trending posts                               |
| YouTube           | YouTube Data API v3                   | Trending videos                                    |
| Calendar          | Google Calendar API                   | Read + create events                               |
| PDF generation    | pdf-lib                               | Editable contract PDFs                             |
| Scheduling        | node-cron                             | Daily trends scan + morning briefing               |
| Validation        | zod                                   | Schema validation everywhere                       |

> **Model note:** This project uses Gemini for now (`@langchain/google`, imported from its `/node` entrypoint — the package replacing the now-deprecated `@langchain/google-genai`) — it has a free tier suited to development and testing. Before production, Anthropic and OpenAI will be added as fallback providers so the assistant survives a single provider outage; which provider(s) the client ultimately prefers isn't decided yet. Because the provider is expected to change and multiply, `lib/llm.ts` must expose one provider-agnostic client that every agent imports — no agent file may import a provider SDK directly or hardcode a model string, so adding or swapping providers later never touches agent code.

---

## Two Surfaces, One Brain

The agent graph is the brain. It is reached two ways:

```
WhatsApp message  ─┐
                   ├─→  REST API  ─→  LangGraph orchestrator  ─→  agent nodes
Web dashboard     ─┘
```

Both surfaces hit the same REST endpoints. The same orchestrator runs regardless of where the message came from. WhatsApp is primary; the dashboard is a window into the same system.

---

## Folder Structure

```
/
├── AGENTS.md                          → Skills index + how the agent should work
├── context/                           → All context files (this folder)
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   ├── progress-tracker.md
│   └── designs/
│       └── glam-ai.html               → Dashboard design reference
│
├── server/                            → Node.js + Express backend
│   ├── index.ts                       → Express app entry, route mounting
│   ├── routes/
│   │   ├── chat.ts                    → POST /api/chat — main agent entry
│   │   ├── whatsapp.ts                → WhatsApp webhook (verify + receive)
│   │   ├── trends.ts                  → GET /api/trends
│   │   ├── scripts.ts                 → GET/POST /api/scripts
│   │   ├── calendar.ts                → GET /api/calendar, POST /api/calendar/propose
│   │   ├── dms.ts                     → GET /api/dms, POST /api/dms/draft-reply
│   │   └── contracts.ts               → POST /api/contracts/draft, GET /api/contracts
│   │
│   ├── agents/                        → LangGraph graph — the brain
│   │   ├── graph.ts                   → Graph definition, nodes + edges
│   │   ├── state.ts                   → Shared AgentState (zod + Annotation)
│   │   ├── orchestrator.ts            → Intent router node
│   │   ├── trends-agent.ts            → Instagram + YouTube trend scan + ranking
│   │   ├── content-agent.ts           → Scripts, captions, hashtags
│   │   ├── calendar-agent.ts          → Read events + propose new events
│   │   ├── dms-agent.ts               → Fetch, classify, summarise, draft replies
│   │   ├── contracts-agent.ts         → RAG retrieve + draft + PDF
│   │   ├── briefing-agent.ts          → Morning briefing builder
│   │   └── types.ts                   → Agent-specific types
│   │
│   ├── services/                      → Third-party API clients
│   │   ├── whatsapp.ts                → WhatsApp Cloud API send/receive
│   │   ├── instagram.ts               → Instagram Graph API (DMs + trends)
│   │   ├── youtube.ts                 → YouTube Data API client
│   │   ├── tiktok.ts                  → STUB — returns [] until API access
│   │   ├── google-calendar.ts         → Google Calendar client
│   │   └── pdf.ts                     → pdf-lib contract rendering
│   │
│   ├── rag/                           → Retrieval over her private documents
│   │   ├── ingest.ts                  → Chunk + embed rate cards / contracts
│   │   ├── retrieve.ts                → Vector search query
│   │   └── embeddings.ts              → Embedding model client
│   │
│   ├── jobs/                          → Scheduled tasks
│   │   ├── scheduler.ts               → node-cron registration
│   │   ├── daily-trends.ts            → Daily Instagram + YouTube scan
│   │   └── morning-briefing.ts        → Daily WhatsApp briefing
│   │
│   ├── db/
│   │   ├── client.ts                  → MongoDB connection (singleton)
│   │   ├── collections.ts             → Typed collection accessors
│   │   └── indexes.ts                 → Index setup incl. vector index
│   │
│   ├── lib/
│   │   ├── llm.ts                     → LLM client (Gemini for now) — single source of model config
│   │   ├── logger.ts                  → Structured logging
│   │   ├── env.ts                     → zod-validated env loading
│   │   └── utils.ts                   → Shared helpers + constants
│   │
│   └── types/
│       └── index.ts                   → Shared backend types
│
└── client/                               → React + Vite dashboard
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                     → Router + layout
    │   ├── index.css                  → Tailwind v4 @theme tokens
    │   ├── lib/
    │   │   └── api.ts                  → fetch wrapper for REST API
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── Topbar.tsx
    │   │   ├── chat/
    │   │   │   ├── ChatPanel.tsx
    │   │   │   ├── MessageBubble.tsx
    │   │   │   └── QuickChips.tsx
    │   │   ├── trends/
    │   │   │   └── TrendCard.tsx
    │   │   ├── scripts/
    │   │   │   └── ScriptCard.tsx
    │   │   ├── calendar/
    │   │   │   ├── CalendarGrid.tsx
    │   │   │   └── EventItem.tsx
    │   │   ├── dms/
    │   │   │   └── DmItem.tsx
    │   │   └── contracts/
    │   │       └── ContractCard.tsx
    │   └── pages/
    │       ├── ChatPage.tsx
    │       ├── TrendsPage.tsx
    │       ├── ScriptsPage.tsx
    │       ├── CalendarPage.tsx
    │       ├── DmsPage.tsx
    │       ├── ContractsPage.tsx
    │       └── SettingsPage.tsx
    └── ...
```

---

## System Boundaries

| Folder            | Owns                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| `server/routes/`  | HTTP only — parse request, call a node or service, shape the response. No logic.   |
| `server/agents/`  | All agent reasoning. Never imports from `routes/`, `services/` clients call out.   |
| `server/services/`| Third-party API wrappers only. No agent reasoning, no DB writes beyond caching.    |
| `server/rag/`     | Embedding + retrieval only. Used by the contracts agent.                           |
| `server/jobs/`    | Scheduled triggers only. They call agents — they contain no agent logic.           |
| `server/db/`      | MongoDB connection, typed collections, indexes. No business logic.                 |
| `server/lib/`     | LLM client, env, logging, shared utils. Imported everywhere.                       |
| `client/`         | UI only. No agent logic. Talks to the backend through `client/src/lib/api.ts`.    |

---

## Data Flow

### WhatsApp message in

```
Sofia sends WhatsApp message
        ↓
WhatsApp Cloud API → POST /api/whatsapp webhook
        ↓
Verify signature, parse message text + sender
        ↓
Call LangGraph orchestrator with { text, channel: "whatsapp" }
        ↓
Orchestrator classifies intent → routes to the right agent node
        ↓
Agent node does its work (may call a service + DB)
        ↓
Response text returned
        ↓
services/whatsapp.ts sends the reply back to Sofia
```

### Dashboard chat in

```
Dashboard sends POST /api/chat { text }
        ↓
Same orchestrator, channel: "web"
        ↓
Response returned as JSON to the dashboard
```

### Daily trends scan (scheduled)

```
node-cron fires daily-trends job
        ↓
trends-agent scans Instagram Graph + YouTube Data
        ↓
The LLM scores each item for makeup-niche relevance
        ↓
Top results upserted into `trends` collection
```

### Morning briefing (scheduled, autonomous)

```
node-cron fires morning-briefing job
        ↓
briefing-agent gathers: today's events, unfinished drafts,
unsent contracts, unreplied brand DMs
        ↓
The LLM composes a short briefing that asks the plan for the day
        ↓
services/whatsapp.ts sends it to Sofia
```

### Contract draft (RAG)

```
Sofia: "draft a contract for the Velour summer deal"
        ↓
contracts-agent retrieves her relevant rate card lines + past
contract clauses from MongoDB Atlas Vector Search
        ↓
The LLM drafts the contract grounded ONLY in retrieved material
        ↓
pdf-lib renders an editable PDF
        ↓
Saved to `contracts` collection + sent to her as a WhatsApp document
```

---

## The Agent Graph

The graph is a router-and-specialists pattern. One orchestrator classifies intent, then hands off to exactly one specialist node, which returns a response.

```
                         ┌──────────────────┐
   incoming message ───→ │   orchestrator   │  (classify intent)
                         └────────┬─────────┘
            ┌─────────────┬───────┼────────┬─────────────┬──────────────┐
            ↓             ↓       ↓        ↓             ↓              ↓
        trends        content  calendar   dms        contracts     briefing
        agent          agent    agent    agent         agent         agent
            └─────────────┴───────┴────────┴─────────────┴──────────────┘
                                   ↓
                            response text
```

- **orchestrator** — single LLM call returns one intent label from a fixed set. Falls back to `content` (general chat) if unsure.
- **trends** — reads stored trends; can trigger a live scan.
- **content** — generates scripts/captions/hashtags.
- **calendar** — reads events; for adds, returns a *proposal* (does not write).
- **dms** — fetches + classifies + drafts; never sends.
- **contracts** — RAG retrieve → draft → PDF.
- **briefing** — only invoked by the scheduler, not the orchestrator.

Intent set (fixed — never invent new ones without updating this list and the orchestrator prompt):

```
trends | content | calendar_read | calendar_add | dms | contract | smalltalk
```

---

## MongoDB Schema

MongoDB holds everything. Collections:

### `profile`

Single document — Sofia's info and preferences.

| Field            | Type     | Notes                                       |
| ---------------- | -------- | ------------------------------------------- |
| _id              | ObjectId |                                             |
| name             | string   | "Sofia Caruso"                              |
| handle           | string   | "@sofiaglam"                                |
| whatsapp_number  | string   | E.164 format, where briefings are sent      |
| niche            | string   | "makeup / beauty"                           |
| style_notes      | string   | Tone + content style for scripts            |
| briefing_time    | string   | Local time for morning briefing, e.g. 08:00 |
| timezone         | string   | IANA tz, e.g. "Europe/Rome"                 |
| created_at       | Date     |                                             |
| updated_at       | Date     |                                             |

### `trends`

Trending content from the scheduled scan.

| Field        | Type     | Notes                                   |
| ------------ | -------- | --------------------------------------- |
| _id          | ObjectId |                                         |
| platform     | string   | "instagram" \| "youtube" (\| "tiktok")  |
| external_id  | string   | Platform post/video id (dedupe key)     |
| title        | string   |                                         |
| url          | string   |                                         |
| thumbnail    | string   | Optional                                |
| metric       | string   | e.g. "2.4M views"                       |
| metric_value | number   | Numeric for sorting                     |
| relevance    | number   | 0-100, LLM-scored to her niche          |
| summary      | string   | Why it's relevant / content angle       |
| scanned_at   | Date     |                                         |

### `scripts`

Generated content.

| Field      | Type     | Notes                                  |
| ---------- | -------- | -------------------------------------- |
| _id        | ObjectId |                                        |
| kind       | string   | "reel" \| "caption" \| "carousel"      |
| title      | string   |                                        |
| trend_id   | ObjectId | Optional — source trend                |
| body       | object   | Structured: hook, body, cta, variants  |
| hashtags   | string[] |                                        |
| status     | string   | "draft" \| "posted"                    |
| created_at | Date     |                                        |

### `dms`

Cached Instagram DMs + classification.

| Field          | Type     | Notes                                          |
| -------------- | -------- | ---------------------------------------------- |
| _id            | ObjectId |                                                |
| ig_thread_id   | string   | Instagram conversation id                      |
| sender_name    | string   |                                                |
| sender_handle  | string   |                                                |
| last_message   | string   |                                                |
| classification | string   | "brand_inquiry" \| "active_collab" \| "ignore" |
| summary        | string   | LLM summary                                    |
| draft_reply    | string   | Suggested reply — NOT sent                     |
| unread         | boolean  |                                                |
| fetched_at     | Date     |                                                |

### `events`

Calendar cache + pending proposals.

| Field         | Type     | Notes                                          |
| ------------- | -------- | ---------------------------------------------- |
| _id           | ObjectId |                                                |
| gcal_id       | string   | Google Calendar event id (null if proposed)    |
| title         | string   |                                                |
| start         | Date     |                                                |
| end           | Date     |                                                |
| location      | string   |                                                |
| status        | string   | "confirmed" \| "proposed"                      |
| created_at    | Date     |                                                |

`proposed` events live here until Sofia approves; on approval they're written to Google Calendar and flipped to `confirmed`.

### `documents`

RAG source material — her rate cards and old contracts, chunked + embedded.

| Field      | Type     | Notes                                          |
| ---------- | -------- | ---------------------------------------------- |
| _id        | ObjectId |                                                |
| doc_type   | string   | "rate_card" \| "contract"                      |
| source     | string   | Original filename                              |
| chunk      | string   | Text chunk                                     |
| embedding  | number[] | Vector — indexed by Atlas Vector Search        |
| created_at | Date     |                                                |

### `contracts`

Drafted contracts.

| Field       | Type     | Notes                                  |
| ----------- | -------- | -------------------------------------- |
| _id         | ObjectId |                                        |
| brand       | string   |                                        |
| deal_summary| string   | What the deal is                       |
| terms       | object   | Structured terms used in the draft     |
| pdf_path    | string   | Stored PDF location / GridFS id        |
| sources     | string[] | Which documents grounded the draft     |
| status      | string   | "draft" \| "sent"                      |
| created_at  | Date     |                                        |

Index: compound `{ brand: 1, status: 1 }` (non-unique) — supports per-brand draft lookups.

### `briefings`

Morning briefing log.

| Field        | Type     | Notes                          |
| ------------ | -------- | ------------------------------ |
| _id          | ObjectId |                                |
| sent_at      | Date     |                                |
| content      | string   | The briefing text sent         |
| her_reply    | string   | Her plan-for-the-day reply     |

### `agent_runs` / `agent_logs`

Same purpose as in the job-getter project — track each agent invocation and log steps for debugging. Scope every query that touches user-specific data, even though this is single-user, so the pattern stays consistent if multi-user is ever added.

---

## File Storage — Contract PDFs

Contract PDFs are stored in **MongoDB GridFS** (everything in MongoDB, per project decision). `contracts.pdf_path` holds the GridFS file id. The dashboard and WhatsApp both fetch the PDF through `GET /api/contracts/:id/pdf`.

---

## RAG Pattern (Contracts)

```
Ingest (one-time + on new upload):
  rate cards + old contracts
        ↓
  chunk into ~500-token pieces
        ↓
  embed each chunk
        ↓
  store { chunk, embedding, doc_type } in `documents`

Retrieve (per contract request):
  build query from brand + deal details
        ↓
  embed query
        ↓
  MongoDB Atlas $vectorSearch top-k chunks
        ↓
  pass retrieved chunks to the LLM as the ONLY source of rates/terms
```

**Note:** This project requires an Atlas-tier MongoDB cluster, since `$vectorSearch` is an Atlas-only feature — the configured `MONGODB_URI` points at such a cluster.

---

## Authentication

This is a single-user personal assistant. The web dashboard is protected by a single login (Sofia's). The WhatsApp webhook is protected by Meta's signature verification — every inbound webhook call must pass signature check before processing. No multi-user auth, no OAuth provider login for end users.

The third-party connections (Instagram, WhatsApp, Google Calendar, YouTube) authenticate **server-side** using tokens the client provides. Those tokens live in env vars, never in the database, never in the frontend.

---

## Invariants

Rules the AI agent must never violate:

- Routes contain no agent reasoning. Agents contain no HTTP handling.
- `server/agents/` never imports from `server/routes/` or `client/`.
- All LLM calls go through `lib/llm.ts` — never import a provider SDK (Gemini's, or later Anthropic's/OpenAI's) directly in agent files.
- The WhatsApp webhook always verifies Meta's signature before processing a message.
- The DMs agent **never sends** a reply. It only drafts. Sending requires a separate, explicitly user-approved action.
- The calendar agent **never writes** an event directly. `calendar_add` produces a `proposed` event; only an explicit approval writes to Google Calendar.
- The morning briefing is the only autonomous outbound action. No other agent messages Sofia unprompted.
- The contracts agent grounds every rate and term in retrieved `documents` chunks. It never invents a number or clause. If retrieval returns nothing relevant, it says so rather than guessing.
- TikTok service always returns an empty array until real API access — never fake TikTok data.
- Every Stagehand-style external call and every API call is wrapped in try/catch and logged to `agent_logs`; one failure never crashes a run.
- The intent set is fixed: `trends | content | calendar_read | calendar_add | dms | contract | smalltalk`. Never add an intent without updating this file and the orchestrator prompt.
- Tokens for third-party services come from env vars only — never stored in MongoDB, never sent to the frontend.
- All MongoDB writes go through typed accessors in `db/collections.ts` — never raw collection access scattered across files.
