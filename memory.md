# Memory — Feature 04: Chat Route + Dashboard Shell

Last updated: 2026-06-25

## What was built

- **Feature 04, fully built, verified, and reviewed:**
  - `server/src/routes/chat.ts` — `POST /api/chat`, zod-validates `{ text }`, generates a `runId`, invokes the compiled LangGraph with `{ input, channel: "web", runId }`, returns `{ success, data: { response } }`. Mounted at `/api/chat` in `server/src/index.ts`.
  - `client/src/lib/routes.ts` — single source of truth for all 7 dashboard pages (`path`, `label`, `icon`, `titleBase`/`titleAccent`, `group`), consumed by both `Sidebar` and `Topbar` so nav and page titles can't drift apart.
  - `client/src/components/layout/Sidebar.tsx` + `Topbar.tsx` — the real, responsive dashboard shell. Desktop (≥1024px): full design, floating card, max-width 900px, labeled sidebar. Tablet (640–1024px): icon-only rail (~64px), full-bleed. Mobile (<640px): sidebar hidden behind a hamburger-triggered overlay drawer (closes on nav-click or backdrop-click), full-bleed. Shell height is full viewport at every breakpoint (the HTML mock's fixed 640px was a static-preview artifact, not carried over).
  - `client/src/components/layout/ComingSoonPanel.tsx` — shared placeholder for unbuilt pages.
  - `client/src/components/chat/{ChatPanel,MessageBubble,QuickChips}.tsx` — real chat UI: typing indicator, quick chips that disappear after first send, auto-growing textarea, Enter-to-send, auto-scroll.
  - `client/src/pages/*.tsx` — all 7 pages exist (`ChatPage` real; `TrendsPage`, `ScriptsPage`, `ContractsPage`, `CalendarPage`, `DmsPage`, `SettingsPage` render `ComingSoonPanel`).
  - `client/src/lib/api.ts` — fetch wrapper + `sendChatMessage`; `client/vite.config.ts` dev proxy (`/api` → `localhost:3001`); `client/.env.example` (`VITE_API_BASE_URL`); `client/src/vite-env.d.ts`.
  - `client/src/App.tsx` + `main.tsx` — rewritten for `BrowserRouter` + the routed shell (`App` is a named export, not default).
  - Installed: `react-router-dom`, `lucide-react`. Both added to `code-standards.md`'s approved dependency list.
  - `/imprint` run for the first time — `ui-registry.md` now has its first six entries (Sidebar, Topbar, ComingSoonPanel, MessageBubble, QuickChips, ChatPanel's input row).
  - `context/ui-tokens.md` + `index.css` — added `--color-backdrop` token (`#000000`, used as `bg-backdrop/40`), replacing a one-off `bg-black/30`.

- **Context docs updated:** `code-standards.md` (dependency list), `ui-tokens.md` (backdrop token), `ui-registry.md` (first entries), `progress-tracker.md` (ticked, decisions, notes).

## Decisions made

- **Routing is React Router with real paths** (`/`, `/trends`, `/scripts`, `/contracts`, `/calendar`, `/dms`, `/settings`), not in-memory panel state — matches `project-overview.md`'s documented page list; each future panel drops into the shell as its own route.
- **Sidebar nav scope: all 7 items now**, six render `ComingSoonPanel`. Groups: **Workspace** = Chat, Trends, Scripts, Contracts (what she produces); **Comms** = Calendar, Instagram DMs, Settings (channels she communicates through). The HTML mock's "WhatsApp" panel became "Settings" (gear icon); **Contracts is new and additional, not a replacement** for the WhatsApp/Settings panel — this was a correction during planning, worth remembering precisely if revisited.
- **`--color-backdrop` token added proactively**, not deferred — features 14, 17, and 20 all need a confirm/approve modal with the same scrim, so defining it once now (rather than letting each scatter its own `bg-black/*`) keeps them consistent.
- **No `cors` package.** Vite dev-proxies `/api/*` to the Express server; production assumes same-origin. `VITE_API_BASE_URL` exists (empty by default) for if that assumption ever changes.
- **`lucide-react` has no Instagram/brand icon** — used `MessageCircle` for the Instagram DMs nav item. Revisit if a closer visual match is wanted once the real DMs panel is built (feature 15).
- **Chat error replies are plain AI bubbles for now** — no distinct error styling. Deliberately deferred to feature 23 (Empty States + Error Handling Pass), which will do this consistently across every panel at once rather than one-off here.

## Problems solved

- Port confusion during verification: `localhost:5173` was serving an unrelated app already running on the machine ("COMFY"); Vite auto-incremented our client to `5174` after detecting the conflict. Caught by reading the actual Vite startup log, not by assuming the default port.
- Found and fixed during `/review`, before declaring the feature done: (1) a redundant Google Fonts `@import` added to `index.css` — `client/index.html` already loads both fonts via `<link>` tags from feature 01, with more precise weights (Playfair italic-only); removed the duplicate. (2) `App.tsx` used a default export, violating `code-standards.md`'s "named exports only" rule (a pre-existing pattern from the feature 01 scaffold that got carried forward without scrutiny) — converted to `export function App` with a matching named import in `main.tsx`.
- `lucide-react@1.21.0` has no `Instagram` export (lucide deliberately excludes brand/logo icons) — caught by `tsc`, substituted `MessageCircle`.

## Current state

- Features 01–04 are all complete, reviewed, and ticked off in `context/progress-tracker.md`. Phase 1 — Foundation is done.
- Verified live, not mocked: real round trip through the compiled LangGraph via `curl` and via the actual dashboard (Playwright) — `"what's trending this week?"` correctly classified by the real orchestrator, routed to the trends stub, rendered in the UI. All three responsive breakpoints screenshotted and checked against `glam-ai.html`. Nav/title/active-state sync confirmed on every route. Mobile drawer confirmed to close on both nav-click and backdrop-click. Zero console errors throughout.
- `tsc -b --noEmit` (client) and `tsc --noEmit` (server) both clean. `eslint .` (client) clean.
- Both dev servers were left running for manual poking: server on `localhost:3001`, client on `localhost:5174` (started via Vite's auto-increment since 5173 was taken by an unrelated process).
- Nothing has been committed to git yet this session — consistent with every prior session on this project. A PR summary was requested and produced in-conversation, not yet committed/pushed.

## Next session starts with

Feature 05 — WhatsApp Webhook + Send: `GET /api/whatsapp` (Meta verification handshake), `POST /api/whatsapp` (verify signature, parse message, run the graph with `channel: "whatsapp"`, send the reply), `server/src/services/whatsapp.ts` (`sendWhatsApp(to, text)`). Read `.agents/skills/architect/SKILL.md` and run that process first, per the engineering loop — it's not a slash command in this harness. This needs real WhatsApp Cloud API credentials (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`) — currently empty in `server/.env.example`/`.env`, worth confirming with the user whether those are ready before building.

## Open questions

- Whether/when to commit features 01–04 — still nothing committed across any session on this project. The user asked for a PR summary this session, which may signal they're ready to commit/push now.
- `@langchain/google` is still pre-1.0 (0.2.x) — flagged previously for a stability re-check during the pre-production multi-provider hardening pass; no action needed yet.
- Whether WhatsApp Cloud API credentials are available yet for feature 05 (see above).
