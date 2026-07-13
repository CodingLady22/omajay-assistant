# Memory — Feature 04: Chat Route + Dashboard Shell (complete)

Last updated: 2026-07-13

## What was built

**Feature 04, fully built, reviewed, all issues resolved:**

- `server/src/routes/chat.ts` — `POST /api/chat`, zod-validates `{ text }`, generates a `runId` via `node:crypto`, invokes the compiled LangGraph with `{ input, channel: "web", runId }`, returns `{ success, data: { response } }`. Mounted at `/api/chat` in `server/src/index.ts`.
- `client/src/lib/routes.ts` — single source of truth for all 7 dashboard pages (`path`, `label`, `icon`, `titleBase`/`titleAccent`, `group`). Consumed by both `Sidebar` and `Topbar` so nav items and page titles cannot drift apart.
- `client/src/components/layout/Sidebar.tsx` + `Topbar.tsx` — responsive shell. Desktop (≥1024px): full labeled sidebar, floating card, max-width 900px. Tablet (640–1024px): icon-only 64px rail, full-bleed. Mobile (<640px): sidebar behind hamburger-triggered overlay drawer, full-bleed.
- `client/src/components/layout/ComingSoonPanel.tsx` — shared placeholder. `px-[22px] py-[18px]` is the canonical panel-body padding every future panel must open with.
- `client/src/components/chat/{ChatPanel,MessageBubble,QuickChips}.tsx` — real chat UI: typing indicator, quick chips that hide after first send, auto-growing textarea, Enter-to-send, auto-scroll, send button disabled while request is in-flight.
- `client/src/pages/*.tsx` — all 7 pages exist. `ChatPage` is real; the other six render `ComingSoonPanel`.
- `client/src/lib/api.ts` — typed fetch wrapper + `sendChatMessage`. Response guarded with `?? "Something went wrong — try again."` fallback for when a future agent node does not set the `response` key.
- `client/vite.config.ts` — dev proxy (`/api` → `localhost:3001`); `client/.env.example` (`VITE_API_BASE_URL`); `client/src/vite-env.d.ts`.
- `client/src/App.tsx` + `main.tsx` — `BrowserRouter` + routed shell. Named export (`export function App`). Catch-all `<Route path="*" element={<Navigate to="/" replace />} />` redirects unknown paths.
- `context/ui-registry.md` — first six entries: Sidebar, Topbar, ComingSoonPanel, MessageBubble, QuickChips, ChatPanel input row. Run `/imprint` after every future UI component.

**Context docs updated:**
- `code-standards.md` — `react-router-dom` + `lucide-react` added to approved dependency list.
- `ui-tokens.md` — `--color-backdrop` and `--shadow-shell` tokens documented. Shell/Cards section updated to reference `shadow-shell`.
- `ui-registry.md` — first six component entries.
- `progress-tracker.md` — feature 04 ticked; 7 decision bullets added including backdrop and shadow tokens.
- `index.css` — `--color-backdrop: #000000` and `--shadow-shell: 0 8px 40px rgba(80,20,40,0.10), 0 1.5px 4px rgba(80,20,40,0.06)` both in `@theme`.

## Decisions made

- **Routing is React Router with real paths** — `/`, `/trends`, `/scripts`, `/contracts`, `/calendar`, `/dms`, `/settings`. In-memory panel state was rejected; each future panel drops into the shell as its own route.
- **Sidebar nav scope: all 7 items now.** Groups: **Workspace** = Chat, Trends, Scripts, Contracts (what she produces); **Comms** = Calendar, Instagram DMs, Settings (channels she communicates through). The HTML mock's "WhatsApp" panel became "Settings" (gear icon). **Contracts is a new, additional item** — not a replacement for WhatsApp/Settings. Worth remembering precisely if revisited.
- **`--color-backdrop` and `--shadow-shell` tokens added proactively.** Features 14, 17, 20 all need modal scrims — one token, not scattered `bg-black/*`. Shadow tokenized now because once panels share the card shadow there is no single place to change an untokenized value. Same reasoning as backdrop.
- **Unknown routes redirect to `/`** via `<Navigate to="/" replace />` — personal tool, seven known nav links, a 404 page adds no value.
- **Send button disabled during in-flight request.** `disabled={isTyping}` with `disabled:opacity-40 disabled:cursor-not-allowed`. Enter key also suppressed (default still prevented). Given LLM latency, rapid double-sends were a real UX risk.
- **`result.data.response` guarded with `??` fallback.** Real agents from feature 08 onward have error paths that may not set `response` — fallback string protects every future feature at zero cost today.
- **No `cors` package.** Vite dev-proxies `/api/*` to Express; production assumed same-origin.
- **`lucide-react` has no Instagram/brand icon.** Used `MessageCircle` for Instagram DMs nav item. Revisit at feature 15 if a closer match is wanted.
- **Chat error replies are plain AI bubbles.** No distinct error styling — deferred to feature 23 (Empty States + Error Handling Pass) to do it consistently across every panel at once.

## Problems solved

- Port conflict during verification: `localhost:5173` was taken by an unrelated app ("COMFY"). Vite auto-incremented to `5174`. Caught by reading the actual Vite startup log.
- `lucide-react@1.21.0` has no `Instagram` export (lucide excludes brand/logo icons). Caught by `tsc`. Substituted `MessageCircle`.
- `App.tsx` default export from the Vite scaffold violated `code-standards.md`'s "named exports only" rule. Fixed: `export function App` + named import in `main.tsx`.
- Redundant Google Fonts `@import` in `index.css` — `client/index.html` already loads both fonts via `<link>` from feature 01 with more precise weights (Playfair italic-only). Removed.

## Current state

- **Features 01–04 complete.** Phase 1 — Foundation is done.
- `tsc -b --noEmit` (client) and `tsc --noEmit` (server) both clean after all fixes.
- Verified live: real round trip through the compiled LangGraph — `"what's trending this week?"` correctly classified, routed to the trends stub, rendered in the UI. All three responsive breakpoints checked against `glam-ai.html`. Nav/title/active-state sync confirmed on every route. Mobile drawer closes on both nav-click and backdrop-click.
- Nothing committed to git yet across any session on this project.

## Next session starts with

Feature 05 — WhatsApp Webhook + Send. Read `.agents/skills/architect/SKILL.md` and run that process first (not a slash command — read and follow manually). The feature needs:
- `GET /api/whatsapp` — Meta verification handshake
- `POST /api/whatsapp` — verify signature, parse message, invoke graph with `channel: "whatsapp"`, send reply
- `server/src/services/whatsapp.ts` — `sendWhatsApp(to, text)`

**Confirm with the user first whether WhatsApp Cloud API credentials are ready** (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` are currently empty in `server/.env.example`). The lazy env pattern (`getWhatsAppEnv()`) is already wired in `lib/env.ts` from feature 02 — credentials are the only blocker.

## Open questions

- Whether/when to commit features 01–04 — still nothing committed. A PR summary was produced this session; pushing may be next.
- `@langchain/google` is still pre-1.0 (0.2.x) — flagged for a stability re-check during the pre-production multi-provider hardening pass. No action needed yet.
- WhatsApp Cloud API credentials status (see above).
