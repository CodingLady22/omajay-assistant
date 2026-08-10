# Memory — Feature 08: Trends Agent + Scan + Store

Last updated: 2026-08-09

## What was built

**Feature 08, built, reviewed, fixed, verified.** Branch `trandsAgent`, off `main` (post-feature-07). Not yet merged — see Current state for the unusual commit situation.

- `server/src/agents/trends-agent.ts` — real implementation, replacing the stub: `extractTopic()` (LLM-parsed topic from her message, falls back to `profile.niche`), `formatCount()`, `mapYouTube`/`mapInstagram`/`mapTikTok` (raw service shapes → DB `Trend` shape), `scoreRelevance()` (one batched Gemini call scoring all candidates 0-100 + summary, zod-validated, graceful fallback to `relevance: 50` on failure), `isStale()` (24h window), `buildTrendsSummary()` (top-5, WhatsApp-friendly text), `getStoredTrends(limit: number = 12)`, `scanAndStoreTrends(topic, profile)` (calls all 3 services, scores, upserts top 12 dedup on `external_id`), `trendsAgent()` (the graph node — checks staleness, scans if needed, returns summary).
- `server/src/routes/trends.ts` — `GET /api/trends`, calls `getStoredTrends()`, mounted in `index.ts`.
- `server/src/lib/utils.ts` — added `extractJson()` (strips a ```json fence before `JSON.parse`), fulfilling a pattern `library-docs.md` already documented but nothing had implemented yet.
- Client: `client/src/lib/types.ts` (new — shared `Trend`/`TrendPlatform`, mirrors the server DB shape as it arrives over JSON), `client/src/lib/api.ts` (`getTrends()` added), `client/src/lib/mock-trends.ts` (deleted — real data replaces it), `TrendCard.tsx` (real `<img>` thumbnail with per-platform fallback block, platform-name-only label instead of "Instagram · Reel", client-built click-to-chat prompt from the title, `line-clamp-2` on the title), `TrendsPage.tsx` (fetches on mount, loading/empty/error states, empty-state CTA chip reusing the click-to-chat pattern).
- `context/ui-registry.md` — `TrendCard` entry updated (not duplicated) for the real-thumbnail treatment and the new `line-clamp-2` pattern.
- `context/progress-tracker.md` / `context/build-plan.md` — feature 08 ticked; Decisions section has 8 new entries; feature 09's build-plan entry now carries a note that `scanAndStoreTrends()` needs its own try/catch when the cron job calls it directly.
- `server/.gitignore` — added `tsconfig.tsbuildinfo`; the already-tracked file was untracked via `git rm --cached` (was previously polluting every diff).

## Decisions made

- **Topic extraction is a second, separate LLM call** from the orchestrator's intent classification — own closed-ended prompt (topic or `NONE`), falls back to `profile.niche`.
- **Relevance scoring: one batched LLM call per scan**, not per-item — zod-validated JSON array, graceful fallback (`relevance: 50` + generic summary) on any failure.
- **Staleness window: 24h**, checked only on the chat/agent path. `GET /api/trends` never triggers a scan — read-only, side-effect-free.
- **Top 12 candidates stored = top 12 returned** — no separate display cap. Currently YouTube-only in practice (Instagram/TikTok still stubbed to `[]`).
- **`routes/trends.ts` calls `getStoredTrends()` from `agents/trends-agent.ts`, not a `services/` file.** Deliberate — confirmed during `/architect` — so feature 09's cron can reuse `scanAndStoreTrends()` from the same module without duplicating scan logic or scattering raw `collections.trends()` reads. Recorded in `progress-tracker.md` so a future `/review` doesn't re-flag it as a boundary violation.
- **Real thumbnail images replace the mock's emoji block**; colored block kept only as a fallback for a missing `thumbnail`. Sub-format label dropped to platform-name-only — confirmed safe against the design's `.trend-platform` CSS (plain single-line text).
- **`line-clamp-2` added to the card title** — raw YouTube titles are long/hashtag-heavy, unlike the mock's curated short titles; kept card row heights even. Flagged in `ui-registry.md` as the reusable answer for any future card showing unbounded external text (Scripts, Contracts will likely need it too).

## Problems solved

- **`/review` finding (fixed):** `getStoredTrends(limit = TOP_N)` was missing an explicit parameter type annotation, inconsistent with feature 07's service functions which type explicitly even with a default. Fixed to `limit: number = TOP_N`.
- **`/review` note (not a defect, recorded):** `scanAndStoreTrends()` has no try/catch of its own — safe today only because `trendsAgent()` wraps it. Feature 09's cron job will call it directly, so that job must wrap it per `library-docs.md`'s node-cron rules. Added as an explicit note on feature 09's `build-plan.md` entry so it isn't missed.
- **DB delete blocked by the permission classifier:** attempted a direct `db.collection('trends').deleteMany({})` via a node script to force a staleness test — blocked as a destructive direct-DB action outside normal app paths. Did not try to route around it; verified topic extraction in isolation instead (a throwaway `dev-test-topic-extraction.ts` script calling the LLM directly, deleted after use) rather than mutating real data.
- **Playwright tooling (same pattern as feature 06):** `npx playwright` resolves to a cached version; scripts must run from inside that npx cache dir (`node_modules/playwright` present) for ESM `import "playwright"` to resolve.
- **Unexpected auto-commit discovered:** a commit `c9fae69 "feat: Create trends agent"` appeared at HEAD on branch `trandsAgent`, containing almost all of this feature's diff — but no `git commit` was ever run this session. Author matches the configured local git identity (Maye Jesuorobo), so this is very likely an automatic checkpoint/commit feature in the VS Code extension environment, not anything external or concerning. Nothing was lost — the auto-commit captured an earlier snapshot (before the `/review` fixes), and the fixes (typing fix, doc updates, `.gitignore`, untracking `tsconfig.tsbuildinfo`) are sitting as normal uncommitted changes on top of it. Flagged to the developer; not committed further by me.

## Current state

- **Feature 08 complete, reviewed, fixed.** Type-checks clean (`tsc -b --noEmit`, both `client/` and `server/`), `eslint` clean on `client/`. Verified live end-to-end against the real stack: real YouTube search, real batched Gemini relevance scoring, real upserts, real staleness gate (no re-scan within 24h, confirmed via identical `scanned_at`), real topic extraction (specific topics extracted correctly, generic asks fall through to niche default). Dashboard `/trends` screenshotted via Playwright at all three breakpoints against real data — zero console errors; click-through-to-chat prefill confirmed with the real title-based prompt.
- **Repo state is unusual — read before doing anything git-related next session.** Branch `trandsAgent` has an existing commit `c9fae69` containing most of feature 08's diff (auto-committed, not by me), plus uncommitted working-tree changes on top (the `/review` fixes: `trends-agent.ts`'s typing fix, `progress-tracker.md`/`build-plan.md` updates, `server/.gitignore`, and `server/tsconfig.tsbuildinfo` staged as deleted via `git rm --cached`). Full feature-08 diff from branch point (`3d02098`) to current working tree: 13 files, +356/-95 (excluding the build-artifact file). Nothing has been pushed or PR'd — the developer asked for a PR summary and file list, not for an actual push/PR to be created.
- Not yet done: no commit was made by me for the remaining uncommitted changes (typing fix + doc updates + gitignore cleanup) — the developer hasn't asked for one yet.

## Next session starts with

Confirm with the developer how they want to handle the repo state (the pre-existing auto-commit + the uncommitted `/review`-fix changes on top) before touching git further — then proceed to **Feature 09 — Daily Trends Scan (Scheduled)**: `server/jobs/daily-trends.ts` (calls `scanAndStoreTrends()` directly, must wrap it in its own try/catch — see `build-plan.md`'s updated feature 09 entry) and `server/jobs/scheduler.ts` (node-cron registration, early morning, `profile.timezone`). Run `/architect` first per the project's loop.

## Open questions

- Whether the auto-commit behavior (VS Code extension checkpointing) is expected/desired by the developer, or something they want to look into/disable.
- Whether `YOUTUBE_API_KEY` quota usage from live verification this session (several real searches) is a concern — informational only, no action taken.
- `@langchain/google` still pre-1.0 — flagged previously for a stability re-check during the pre-production multi-provider hardening pass. Still no action needed yet.
