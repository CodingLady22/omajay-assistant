# Memory

Maintained by the `/remember` skill. AI has no memory between sessions — this file carries context across them.

- **`/remember save`** at the end of a session compresses what matters into this file.
- **`/remember restore`** at the start of a session restores it and confirms before continuing.

Don't edit this by hand unless `/remember` isn't available. The sections below are a starting point; the skill will keep them current.

---

## Project Snapshot

Glam AI — personal AI assistant for a makeup influencer (Sofia). WhatsApp is the primary interface; a React dashboard is secondary. Six capabilities: trends, scripts, calendar, Instagram DMs, contracts (RAG), and a morning briefing.

Stack: React + Vite + Tailwind v4 · Node + Express + TypeScript · LangGraph.js + LangChain.js · Claude via `@langchain/anthropic` · MongoDB (data + GridFS + Atlas Vector Search) · WhatsApp Cloud API · Instagram Graph API · YouTube Data API · Google Calendar API · pdf-lib · node-cron.

Full detail in `context/`. Build order in `context/build-plan.md`. Status in `context/progress-tracker.md`.

---

## Key Decisions (carry these every session)

- Model is Claude, not GPT-4o.
- Everything in MongoDB, including contract PDFs (GridFS) and RAG vectors (Atlas Vector Search).
- Trends: both a scheduled daily scan and on-demand.
- Contract output: editable PDF, grounded only in retrieved rate cards / past contracts — never invented terms.
- Only autonomous outbound action: the morning WhatsApp briefing (asks plan-for-day + reminds about unfinished projects).
- DM replies and calendar adds always require explicit approval — agents draft/propose, never send/write directly.
- TikTok is stubbed (returns `[]`) until the client has API access.
- **Mock data throughout the build** — real accounts and documents connected only at production.

---

## Current State

_Updated by `/remember save`. At project start: nothing built yet. Next step is feature 01 in the build plan._

---

## Open Threads / Watch For

- Skills table in `AGENTS.md` lists the workflow skills (`/architect`, `/remember`, `/review`, `/recover`, `/imprint`). No library-API skills are installed — verify third-party APIs against official docs.
- Real contract documents (rate cards, old contracts) are placeholders until production.
