# Memory — GitHub Actions CI

Last updated: 2026-11-09

## What was built

A checks-only CI pipeline (no deploy, no secrets, no env vars — none are needed to typecheck/lint/build):

- `.github/workflows/ci.yml` — triggers on push to `main` and on every pull request. Two parallel jobs on `ubuntu-latest`, each running inside its own package folder via `defaults.run.working-directory`:
  - `server`: checkout → setup-node (npm cache, `server/package-lock.json`) → `npm ci` → `npm run typecheck`
  - `client`: checkout → setup-node (npm cache, `client/package-lock.json`) → `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`
- `.nvmrc` at repo root containing `22`; both jobs use `node-version-file: .nvmrc` so CI reads the declared version rather than a second hardcoded copy.
- `server/package.json` and `client/package.json`: added `"typecheck": "tsc -b --noEmit"` and `"engines": { "node": ">=22.12" }`.

All of these were run locally and pass (server typecheck; client typecheck, lint, build). The workflow itself has not yet run on GitHub.

## Decisions made

- Every CI `run:` step is `npm ci` or an `npm run <script>` — CI mirrors what the developer runs locally, no bespoke inline commands.
- Server and client are separate jobs (no root package.json / workspaces; each has its own lockfile).
- Client keeps a standalone `typecheck` step even though `build` also runs `tsc -b` — deliberate, gives a clearer error line in the CI log.
- Server has no lint and no build in CI: no ESLint config exists in `server/` and its tsconfig is `noEmit`. Adding server linting is a separate, later task, not part of the CI file.
- Node pinned to major 22 (local is v22.12.0; Vite 8 needs `^20.19 || >=22.12`).
- The `ci.yml` inline comments were stripped on disk by the developer between edits — treated as deliberate, not restored.

## Problems solved

- None blocking. Noted: the repo had no `.nvmrc`/`engines`, so the Node version had to be inferred from the local install and Vite's engine range before being pinned.

## Current state

- CI files and the two `package.json` edits are done and verified locally; PR creation was the final step of this session.
- Server linting/build: intentionally absent.
- All 27 app features remain shipped except 05 (WhatsApp) and 15-17 (Instagram DMs), still blocked on credentials.

## Next session starts with

Check the CI run on the PR (first real run on GitHub's runners) and fix anything environment-specific if it fails. After that, the recorded follow-ups still stand: briefing status-based filter (small own feature), `ContractCard` link-chip extraction on a third occurrence, and the production cutover (WhatsApp/Instagram/Google Calendar, plus the deferred auth hardening: `trust proxy` and `requireAuth` explicit allowlist).

## Open questions

- Whether to add server linting (needs an ESLint config first) as its own task.
- `DASHBOARD_PASSWORD` is still a dev value in `server/.env`; Sofia needs a real private one before production.
- `@langchain/google` is still pre-1.0 — re-check during the multi-provider hardening pass.
