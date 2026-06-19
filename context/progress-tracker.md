# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** 1 — Foundation
**Last completed:** 01 Monorepo Scaffold
**Next:** 02 MongoDB Connection + Collections

---

## Progress

### Phase 1 — Foundation

- [x] 01 Monorepo Scaffold
- [ ] 02 MongoDB Connection + Collections
- [ ] 03 LLM Client + Graph Skeleton
- [ ] 04 Chat Route + Dashboard Shell

### Phase 2 — WhatsApp

- [ ] 05 WhatsApp Webhook + Send

### Phase 3 — Trends

- [ ] 06 Trends Panel — Full UI (Mock)
- [ ] 07 YouTube + Instagram Trend Services
- [ ] 08 Trends Agent + Scan + Store
- [ ] 09 Daily Trends Scan (Scheduled)

### Phase 4 — Content

- [ ] 10 Scripts Panel — Full UI (Mock)
- [ ] 11 Content Agent + Save

### Phase 5 — Calendar

- [ ] 12 Calendar Panel — Full UI (Mock)
- [ ] 13 Calendar Read
- [ ] 14 Calendar Add — Propose Then Confirm

### Phase 6 — Instagram DMs

- [ ] 15 DMs Panel — Full UI (Mock)
- [ ] 16 DMs Fetch + Classify + Summarise
- [ ] 17 DM Reply — Draft Then Approve

### Phase 7 — Contracts (RAG)

- [ ] 18 Document Ingest + Vector Index
- [ ] 19 Contracts Panel — Full UI (Mock)
- [ ] 20 Contracts Agent — Retrieve, Draft, PDF

### Phase 8 — Morning Briefing

- [ ] 21 Briefing Agent + Scheduled Send

### Phase 9 — Settings + Polish

- [ ] 22 Settings Panel
- [ ] 23 Empty States + Error Handling Pass

---

## Decisions Made During Build

_Add decisions here as they are made during implementation._

- Model: Claude via `@langchain/anthropic` (not GPT-4o).
- Everything in MongoDB, including contract PDFs (GridFS) and RAG vectors (Atlas Vector Search).
- TikTok stubbed until client gets API access.
- Trends: both scheduled daily scan and on-demand.
- Contract output: editable PDF.
- Only autonomous action: morning WhatsApp briefing (asks plan-for-day + reminds unfinished projects). DM replies and calendar adds always require approval.
- Frontend folder is `client/`, not `web/` as architecture.md originally said — all context docs corrected to match the actual scaffold.
- Server `tsconfig.json` uses `"moduleResolution": "bundler"` (not `"nodenext"`) so `@/` imports stay extension-less, matching the import style shown in `code-standards.md`. TypeScript 6 still needs `baseUrl` alongside `paths` for alias resolution to work, with `"ignoreDeprecations": "6.0"` to silence the TS7 deprecation error.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- `server/lib/env.ts` requires every token in `code-standards.md`'s env table (plus `PORT`, default 3001) — there is no phased/optional mode. The server will not boot without a `.env` (gitignored) that has a value, even a placeholder, for each one. Verified: missing vars throw a loud, structured error listing exactly which keys are absent; a fully-populated `.env` boots the server and `GET /health` returns `{ success: true, data: { status: "ok" } }`.
- Added `server/.gitignore` — none existed, so `server/node_modules` was previously unprotected from `git add`.
- Installed for feature 01: `express`, `dotenv` (already present) + `zod` (added). The rest of the approved dependency list (`mongodb`, `@langchain/*`, `pdf-lib`, `node-cron`, `googleapis`) is intentionally not installed yet — each gets added when its feature is built, per `code-standards.md`'s "never install without a clear reason."
