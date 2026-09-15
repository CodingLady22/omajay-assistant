# Memory — Feature 26: Single-user Auth

Last updated: 2026-09-13

## What was built

**Feature 26 (Phase 10 — Auth + Deploy Readiness), the last gap `architecture.md` had always anticipated but no feature had built.** Every `/api/*` route was unauthenticated for the whole build until now. This feature adds a single shared-password gate in front of the dashboard/API: a cookie-based session, a login page, and a logout control — no per-user accounts, matching the single-user product.

Server:
- `server/src/lib/env.ts` — `DASHBOARD_PASSWORD`/`SESSION_SECRET` added to the *eager/core* schema (not lazy, since they now gate the whole app); new `isProduction` export.
- `server/src/lib/session.ts` (new) — `createSessionToken()`/`verifySessionToken()` (self-verifying `base64url(payload).hmacSignature` cookie, no session store), `verifyPassword()` (HMAC-then-`timingSafeEqual`, safe against variable-length attacker input), `getSessionTokenFromRequest()` (manual `Cookie` header parse, no `cookie-parser` dependency), `sessionCookieOptions()`.
- `server/src/middleware/requireAuth.ts` (new folder) — gates a request on a valid session cookie, else `401` in the standard wrapper.
- `server/src/routes/auth.ts` (new) — `POST /login` (in-memory per-IP throttle: 5 failed attempts / 15 min, resets on restart or a success), `POST /logout`, `GET /status` (always 200, never gated).
- `server/src/index.ts` — `/api/auth` mounted before `app.use("/api", requireAuth)`; every other router stays mounted after the gate, unchanged. `/health` untouched (outside `/api`). A comment at the mount site flags that `/api/whatsapp`, once feature 05 lands, must mount pre-gate too (keeps its own Meta signature check).
- `server/.env.example` and the real `server/.env` both updated with `DASHBOARD_PASSWORD`/`SESSION_SECRET` (generated fresh this session — see "Open questions" below for how to change it).

Client:
- `client/src/lib/types.ts` (`AuthStatus`), `client/src/lib/api.ts` (`getAuthStatus`/`login`/`logout`).
- `client/src/pages/LoginPage.tsx` (new) — single password field, built directly from `ui-tokens.md`'s Input/primary-button specs (no design-HTML mock exists for this page).
- `client/src/App.tsx` — gates on `GET /api/auth/status` (loading → `LoginPage` → shell); passes `onLogout` down to `Sidebar`.
- `client/src/components/layout/Sidebar.tsx` — logout icon button added to the existing avatar block, visible at the same breakpoints as the name text.

Docs updated: `architecture.md` (folder tree, System Boundaries row for `server/middleware/`, Authentication section rewritten to describe the real mechanism), `code-standards.md` (env var table), `build-plan.md` (addendum noting the throttle + logout-placement decisions beyond the original spec), `progress-tracker.md` (feature 26 ticked off, full decisions recorded).

Not yet committed — working tree has all of the above staged as uncommitted changes on the `auth` branch.

## Decisions made

- `DASHBOARD_PASSWORD`/`SESSION_SECRET` are eager/core env vars (server refuses to boot without them), not lazy — unlike every other integration credential, these now gate every request.
- Password and session-signature comparisons both go through an HMAC-then-`timingSafeEqual` helper, never a raw `timingSafeEqual` on attacker-controlled variable-length input (which would throw on a length mismatch).
- No `cookie-parser` dependency — Express's own `res.cookie()` covers writing; reading is a few lines of manual header parsing.
- Session is self-verifying (signed cookie), no session store, no DB collection. TTL 7 days (developer decision — matches daily-use expectations for a personal dashboard).
- Login throttle: simple in-memory per-IP counter, 5 attempts / 15 min, module-scoped inside `routes/auth.ts` (same precedent as `jobs/scheduler.ts`'s module-scoped live cron task) rather than its own file.
- Logout lives in the sidebar's avatar block (developer's explicit choice over a Settings-page row).
- New `server/middleware/` folder for `requireAuth.ts` — doesn't fit any existing folder boundary.

## Problems solved

- **A stale server process from an earlier session was still holding port 3001 with its own in-memory throttle state, and `pkill -f "tsx watch..."` did not kill it** — Windows/Git-Bash `pkill -f` apparently doesn't reliably reach the child process `tsx watch` actually spawns to run the script; the parent matched and died, the child holding the port didn't. This produced confusing premature-`429` throttle results during verification that had nothing to do with the throttle logic (which was correct all along). Fix: find the real PID via `netstat -ano | grep LISTENING` and force-kill it with `taskkill //PID <pid> //F`. **Remember this for any future session on this machine** — if a "freshly started" dev server behaves like it has leftover state, check `netstat` for a stale PID before assuming a code bug.

## Current state

- Feature 26 fully built, `/code-review`'d, and re-verified live after fixes — considered done.
- **`/code-review` found 7 issues; 5 fixed this session, 2 deferred by explicit developer decision** (both recorded in `progress-tracker.md`'s feature 26 Decisions, not built): `trust proxy`/`req.ip`-behind-a-proxy (bundled into the already-planned production cutover) and `requireAuth`'s exemption-by-mount-order-and-comment instead of an explicit allowlist (not exploitable today since `/api/whatsapp` doesn't exist yet; a hardening item for the same later pass).
- The 5 fixed issues, all re-verified live: (1) a malformed-percent-encoding cookie no longer crashes the server — `getSessionTokenFromRequest` catches the `decodeURIComponent` failure, and `/logout`/`/status` both gained `try/catch`; (2) the sidebar logout button no longer disappears at tablet width (640–1024px) — the avatar block now stacks vertically at that breakpoint instead of hiding the button entirely; (3) an expired session (past the 7-day TTL) now correctly redirects to `LoginPage` — `api.ts` calls a registered handler on any `401`, and `App.tsx`'s handler re-checks `/api/auth/status` (not blind trust of one 401) before flipping state, confirmed via Playwright to *not* bounce on a transient single-route 401 but to correctly bounce when the real status check also says unauthenticated; (4) the login throttle's `attemptsByIp` Map now self-evicts stale entries every 5 minutes (`.unref()`'d interval) so it can't grow unbounded against a public endpoint; (5) the one uncommented type assertion in `session.ts` now has a justifying comment.
- Full flow re-verified live end-to-end after all fixes: unauthenticated `401`s, login → cookie → protected routes succeed, wrong password `401`, 5-attempt throttle → `429` (including correct password mid-lockout), logout → re-locks, malformed cookie degrades cleanly instead of crashing, expired-session redirect works, logout icon visible at all three breakpoints (1280/800/375px, screenshotted). `tsc -b --noEmit` clean on both `server/` and `client/` after the fixes.
- No dev servers left running — confirmed via `netstat` + `taskkill //PID <pid> //F` (this machine's `pkill -f` still doesn't reliably kill `tsx watch`/`vite` child processes — see Problems solved, this bit the review-verification pass a second time before I remembered to check `netstat` directly).
- Confirmed earlier this session (still true, not stale): the feature 27 code-review fixes are committed (`41457a1`), along with a `refineScript` PR merge (`0872df7`). No loose ends from feature 27 remain.
- Working tree has all of feature 26's changes (initial build + the 5 review fixes) uncommitted on the `auth` branch, plus `MessageBubble.tsx`/`Sidebar.tsx` showing minor IDE auto-format diffs (arbitrary Tailwind values canonicalized — no functional change).

## Next session starts with

Feature 26 is done — reviewed, fixed, re-verified. Ask the developer how they want to commit (all of feature 26 including the review fixes in one commit, or split the initial build from the review-fix round). After that: all 27 planned/inserted features are shipped, so the next real work is either the three recorded-but-deferred follow-ups (briefing status-based filter as its own small feature; `ContractCard`'s link-chip extraction, still waiting on a third occurrence; the production cutover bundling WhatsApp/Instagram/Google Calendar, now also carrying the two deferred auth hardening items — `trust proxy` config and `requireAuth`'s explicit allowlist) or new developer-directed scope.

## Open questions

- **How Sofia gets her real login password**: right now `DASHBOARD_PASSWORD` is just a value in `server/.env` (gitignored, never committed) — the developer sets it directly by editing that file and restarting the server. There's no self-service "change password" UI; feature 26 built a single shared password, not per-user account management, matching `build-plan.md`'s original spec. Before real production use, the developer should replace the session-generated dev password with a real, private one Sofia is given directly (out-of-band, e.g. told in person/securely) — not built as a UI flow. If a self-service change-password flow is ever wanted, that's new scope, not something this feature covers.
- Three items deliberately recorded as separate future work during this feature's triage, not built here: (1) briefing's 14-day recency cap → real `status`-based filter, as its own small future feature; (2) `ContractCard`'s duplicated download-link className, extract on a third occurrence; (3) Google Calendar dev→prod swap, bundled into the eventual production cutover.
- `@langchain/google` still pre-1.0 (0.2.x) — watch-only, re-check during the eventual multi-provider hardening pass.
- Atlas Search index detection is CLOSED (confirmed already built/verified in feature 20) — no longer an open question, don't re-raise it.
