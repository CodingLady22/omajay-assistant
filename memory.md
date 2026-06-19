# Memory — Feature 01: Monorepo Scaffold (Tailwind v4 + server foundation)

Last updated: 2026-06-19

## What was built

- **Tailwind v4 in `client/`**: installed `tailwindcss` + `@tailwindcss/vite`, added the plugin to `client/vite.config.ts`, added Google Fonts (DM Sans, Playfair Display italic) to `client/index.html`, replaced `client/src/index.css` with the full `@theme` token block from `context/ui-tokens.md` plus a base `body` rule.
- **Deleted root `index.html`** — it was a duplicate/earlier draft of `context/designs/glam-ai.html` (same markup, placeholder name "Oma Jay" instead of "Sofia Caruso"), had no functional role, fully redundant with the design reference.
- **Renamed every `web/` folder reference to `client/`** across `AGENTS.md`, `context/architecture.md`, `context/build-plan.md`, `context/code-standards.md`, `context/ui-rules.md`, `context/ui-registry.md`, `context/ui-tokens.md`. Left generic prose ("web dashboard") and the `channel: "web"` enum value untouched.
- **Server foundation (feature 01 server half)**:
  - `server/.gitignore` (none existed — `server/node_modules` was unprotected)
  - `server/src/lib/utils.ts` — `nowISO()`
  - `server/src/lib/logger.ts` — structured `info`/`warn`/`error`, context-prefixed
  - `server/src/lib/env.ts` — zod-validated env loading for every var in `code-standards.md` plus `PORT` (default 3001); throws a loud structured error listing exactly which vars are missing
  - `server/.env.example`
  - `server/src/index.ts` — real Express app, `GET /health` → `{ success, data: { status } }`, listens on `env.PORT`
  - `server/tsconfig.json` — added `@/` alias (`baseUrl` + `paths`), switched `module`/`moduleResolution` from `nodenext` to `esnext`/`bundler`, removed stray `"jsx": "react-jsx"`, added `"ignoreDeprecations": "6.0"`
  - Installed `zod` (kept `mongodb`, `@langchain/*`, `pdf-lib`, `node-cron`, `googleapis` uninstalled — deferred to the features that need them)
- **`client/tsconfig.app.json`** — added `@/` alias, explicit `"strict": true`
- **`client/vite.config.ts`** — added `resolve.alias` for `@` → `./src`
- **`context/progress-tracker.md`** — feature 01 checked off, phase/last-completed/next updated, decisions + notes recorded

## Decisions made

- Frontend folder is `client/`, not `web/` (architecture.md had the wrong name) — corrected everywhere.
- Defer bulk-installing the rest of the approved server dependencies until each one's feature is actually built (`code-standards.md`: "never install without a clear reason"). Only `express`, `dotenv`, `zod` installed so far.
- `server/lib/env.ts` requires every token unconditionally, no phased mode — local dev needs a `.env` with a placeholder value for every key even before those integrations exist. This is intentional (the point is to fail loudly on anything missing), not a bug.
- Server tsconfig uses `"moduleResolution": "bundler"` (not `"nodenext"`) so `@/` imports stay extension-less, matching the import style documented in `code-standards.md`.

## Problems solved

- TS6 hard-errors on standalone `baseUrl` (TS5101) unless `"ignoreDeprecations": "6.0"` is set — but `baseUrl` is still functionally required alongside `paths` for alias resolution at this TS version; both must stay together.
- `"module": "nodenext"` forced `.js` extensions on every import (including aliased ones) because `package.json` has `"type": "module"` — broke extension-less `@/lib/env` imports. Fixed by switching to `module: "esnext"` + `moduleResolution: "bundler"`.
- TS path-mapping and Vite's bundler resolution are independent — `tsconfig.app.json` paths alone don't make Vite resolve `@/`; needed `resolve.alias` in `vite.config.ts` too. Verified with a throwaway aliased import wired into `main.tsx` (module count went 16 → 18 in the Vite build), then removed.

## Current state

- Feature 01 (Monorepo Scaffold) is fully done and verified: server boots; env validation fails loudly on missing vars and succeeds with placeholders (`GET /health` → `{"success":true,"data":{"status":"ok"}}`); client dev server responds 200; both tsconfigs strict with working `@/` aliases; Tailwind v4 live in `client/`.
- `client/src/App.tsx` / `App.css` have pre-existing uncommitted changes (App.tsx stripped to an empty stub, App.css deleted) that predate this session — not touched, left as-is as likely in-progress work.
- Nothing committed yet — all changes are sitting in the working tree. `server/` is still entirely untracked.

## Next session starts with

Feature 02 — MongoDB Connection + Collections: `server/db/client.ts` (connection singleton), `server/db/collections.ts` (typed accessors for every collection in `architecture.md`), `server/db/indexes.ts` (standard indexes + the Atlas Vector Search index on `documents.embedding`), seed a single `profile` document. Will need to install `mongodb` at that point. Run `/architect` first per the project's engineering loop.

## Open questions

- Nothing blocking. Worth checking with the user whether to commit the feature 01 work as a checkpoint before starting feature 02 — nothing is committed yet.
