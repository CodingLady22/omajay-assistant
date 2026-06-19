# Glam AI

A personal AI assistant for a makeup influencer (Sofia). She talks to it mostly over **WhatsApp**; a React dashboard is the secondary surface. It finds trends, writes scripts, manages her calendar, filters her Instagram DMs, drafts contracts from her own rate cards and past deals (RAG), and sends her a morning briefing.

This is a single-user, single-tenant assistant — there's no multi-user account system.

---

## What It Does

1. **Finds trending content** — scans Instagram and YouTube (TikTok stubbed until API access) for viral makeup videos, posts, and looks.
2. **Writes ideas and scripts** — turns a trend or a vibe into a Reel script, caption, or post idea.
3. **Manages her calendar** — reads Google Calendar freely; adding an event is always proposed first, never written silently.
4. **Watches her Instagram DMs** — filters brand inquiries and active collabs from fan mail, summarises them, and drafts replies (never sends on its own).
5. **Drafts contracts** — retrieves her own rate cards and past contracts (RAG) and drafts a new one as an editable PDF.
6. **Talks to her on WhatsApp** — every feature above is reachable by chat, plus an autonomous daily morning briefing.

See `context/project-overview.md` for the full picture.

---

## Stack

| Layer           | Tool                                          |
| --------------- | ---------------------------------------------- |
| Frontend        | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend         | Node.js + Express + TypeScript                |
| Agent framework | LangGraph.js + LangChain.js                    |
| LLM             | Claude (Anthropic) via `@langchain/anthropic`  |
| Database        | MongoDB (data + GridFS + Atlas Vector Search)  |
| Messaging       | WhatsApp Cloud API                             |
| Integrations    | Instagram Graph API, YouTube Data API, Google Calendar API |
| PDFs            | pdf-lib                                        |
| Scheduling      | node-cron                                      |
| Validation      | zod                                            |

Full detail in `context/architecture.md`.

---

## Project Structure

```
/
├── client/      → React + Vite dashboard
├── server/      → Node + Express API, agents, services
├── context/     → Project documentation (read this before building anything)
└── AGENTS.md    → Entry point for AI agents working on this repo
```

---

## Getting Started

Requires Node.js 22+ and npm.

### Client (dashboard)

```bash
cd client
npm install
npm run dev
```

Runs the Vite dev server (default `http://localhost:5173`).

### Server (API)

```bash
cd server
npm install
cp .env.example .env   # fill in real values — server won't boot without them
npm run dev
```

Runs on `http://localhost:3001` by default (`PORT` in `.env`). `GET /health` confirms it's up.

The server validates every environment variable with zod at startup (`server/src/lib/env.ts`) and fails loudly if any are missing — see `server/.env.example` for the full list.

---

## Documentation

This repo is documented for both humans and AI agents working on it. Start with:

- **`AGENTS.md`** — entry point: how to work in this repo, the skills workflow, hard safety rules
- **`context/project-overview.md`** — what the product does and why
- **`context/architecture.md`** — stack, folder structure, data flow, MongoDB schema, invariants
- **`context/code-standards.md`** — implementation conventions
- **`context/build-plan.md`** — the feature-by-feature build plan
- **`context/progress-tracker.md`** — current build status

---

## Status

Build is in progress, following `context/build-plan.md` one feature at a time. See `context/progress-tracker.md` for what's done and what's next.

## Safety Rules

A few things are non-negotiable regardless of how the code evolves:

- The DMs agent never sends a reply on its own — only drafts.
- The calendar agent never writes an event directly — it proposes, and a separate approval writes it.
- The only autonomous outbound message is the daily morning briefing.
- The contracts agent never invents a rate or term — everything is grounded in retrieved documents.
- TikTok stays stubbed (`[]`) until real API access is available.

Full list in `AGENTS.md`.
