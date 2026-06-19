# AGENTS.md

This is the entry point for any AI agent (Claude Code) working on Glam AI. Read this first, every session.

---

## What This Project Is

Glam AI is a personal AI assistant for a makeup influencer (Sofia). She talks to it mostly over **WhatsApp**; a React dashboard is the secondary surface. It finds trends, writes scripts, manages her calendar, filters her Instagram DMs, drafts contracts from her own rate cards and past deals (RAG), and sends her a morning briefing.

Full detail is in `context/`. Read these before building:

1. `context/project-overview.md` — what it does and why
2. `context/architecture.md` — stack, folders, data flow, schema, invariants
3. `context/code-standards.md` — how to write code here
4. `context/library-docs.md` — how this project uses each library
5. `context/ui-tokens.md`, `context/ui-rules.md`, `context/ui-registry.md` — dashboard UI
6. `context/build-plan.md` — the feature-by-feature plan
7. `context/progress-tracker.md` — what's done and what's next
8. `context/designs/glam-ai.html` — the dashboard design, source of truth for UI

---

## How To Work

- **One feature at a time**, in the order in `context/build-plan.md`.
- **Read context before coding.** Never assume an API or pattern — verify against the context files.
- **UI first, then logic.** Build each panel with mock data and confirm it matches the design before wiring real data.
- **Update `context/progress-tracker.md`** after every completed feature.
- **Respect the invariants** in `architecture.md` and the safety rules in `code-standards.md` — they are not optional.
- **Mock data until production.** Build and test every feature against placeholder data (sample trends, fake DMs, dummy rate cards and contracts). Real accounts and documents get connected only when the app is ready for production.

---

## Skills — The Engineering Loop

Skills for this project come from: https://github.com/JavaScript-Mastery-Pro/skills

These five skills are a workflow, not just reference docs. Use them at the right moments:

| Skill | When to use | What it does |
| ----- | ----------- | ------------ |
| `/architect` | **Before building anything** | Think through the feature like a senior engineer first. Surfaces decisions, aligns on approach, produces an implementation plan to confirm before code is written. Collaborative, not a grilling. |
| `/remember save` | **End of every session** | Compresses what matters into `memory.md` so the next session isn't blank. |
| `/remember restore` | **Start of every session** | Restores full context from `memory.md` and confirms before continuing. |
| `/review` | **After building any feature** | Verifies the build is *correct*, not just working — checks plan alignment, system integrity, production readiness. Reports issues for the developer to decide on. |
| `/imprint` | **After building any UI component** | Extracts the component's visual patterns into `context/ui-registry.md` so later components match. `/imprint audit` scans the whole codebase to establish a baseline. |
| `/recover` | **When something breaks** | Diagnoses the failure type first — targeted fix, hard reset, or rethink — before responding. |

The loop:

```
/architect  →  Build  →  /review  →  Ship
                 ↓
/imprint   (after every UI component)
/remember  (start and end of every session)
/recover   (when something breaks)
```

How this maps to this project:

- **`/architect` before each feature** in `build-plan.md` — confirm the plan before writing code.
- **`/imprint` after each dashboard panel/component** — it maintains `context/ui-registry.md` for you. Don't fill that file by hand.
- **`/remember save` / `restore` around every session** — keeps continuity across the 23 features. Reads and writes `memory.md` at the project root.
- **`/review` after each feature** — before ticking it off in `progress-tracker.md`.
- **`/recover` when stuck** — instead of patching blindly.

Order of authority for library usage:

```
MCP server (real-time) → Skills (this repo) → context/library-docs.md (project rules) → general knowledge
```

---

## MCP Connectors

If any of these MCP connectors are configured, prefer them over manual API calls:

- **Google Calendar** — for reading/creating events
- **MongoDB** — for schema/index work and queries
- (others as added)

---

## Hard Safety Rules (never break)

- The **DMs agent never sends** a reply — it only drafts. Sending needs an explicit approval route.
- The **calendar agent never writes** an event directly — it proposes; a separate approval writes to Google Calendar.
- The **only autonomous outbound** message is the morning briefing. Nothing else messages Sofia unprompted.
- The **contracts agent grounds every rate and term in retrieved documents** — it never invents numbers. Empty retrieval → say so.
- **TikTok stays stubbed** (returns `[]`) until the client has API access — never fabricate TikTok data.
- **All LLM calls** go through `server/lib/llm.ts`. **All tokens** come from env vars, never the DB, never the frontend.

---

## Stack At A Glance

React + Vite + Tailwind v4 (web) · Node + Express + TypeScript (server) · LangGraph.js + LangChain.js · Claude via `@langchain/anthropic` · MongoDB (data + GridFS + Atlas Vector Search) · WhatsApp Cloud API · Instagram Graph API · YouTube Data API · Google Calendar API · pdf-lib · node-cron. TypeScript everywhere, strict. REST API.
