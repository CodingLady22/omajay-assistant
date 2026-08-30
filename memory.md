# Memory — Feature 23: Mark Script Posted / Contract Sent

Last updated: 2026-08-30

## What was built

Feature 23 shipped via the full loop: `/architect` → build → live verify → `/imprint` → tick `progress-tracker.md` → commit (developer's own commit, `d7608df`) → a follow-up `/code-review` pass caught 3 real issues in the just-shipped refetch logic → fixed → re-verified live (uncommitted as of end of session, left for the developer to review/commit).

**Server:**
- `server/src/agents/content-agent.ts` — `setScriptStatus(id, status)` added (reversible `findOneAndUpdate` by `_id`, no current-status filter).
- `server/src/agents/contracts-agent.ts` — `setContractStatus(id, status)` added, same shape.
- `server/src/routes/scripts.ts` — `POST /:id/status` added (zod `idParamSchema` + `statusBodySchema` = `z.enum(["draft", "posted"])`).
- `server/src/routes/contracts.ts` — `POST /:id/status` added, `z.enum(["draft", "sent"])`.
- `server/src/types/index.ts` — `ContractStatus` type newly named/exported (mirroring the existing `ScriptStatus`).

**Client:**
- `client/src/lib/api.ts` — `setScriptStatus`/`setContractStatus`.
- `client/src/components/scripts/ScriptCard.tsx` — first-ever status badge (`Draft`/`Posted`, `bg-info-bg text-info`, next to the kind badge) + a reversible toggle `<Chip>` ("Mark posted" ⇄ "Mark as draft"), `onChange?: () => void` prop.
- `client/src/components/contracts/ContractCard.tsx` — same toggle chip pattern ("Mark sent" ⇄ "Mark as draft"), `onChange?: () => void` prop.
- `client/src/pages/ScriptsPage.tsx` / `ContractsPage.tsx` — fetch logic extracted into a `refetch`/`refetchContracts` callback passed down as `onChange`; **post-ship hardened** with a `requestIdRef` (ignore out-of-order/superseded responses) and a `hasLoadedRef` + `refreshError` state (a post-mount refetch failure no longer blanks an already-rendered list — it keeps existing cards and shows a small inline note instead; only a genuine *initial*-load failure gets the full-screen error).
- `client/src/components/calendar/EventItem.tsx` — one-line stale-comment fix (`feature 23's` → `feature 25's` unified error-styling pass reference).

**Docs:** `context/build-plan.md` (feature 23 entry corrected: reversible not one-way), `context/progress-tracker.md` (ticked, full decisions + the post-ship `/code-review` fix writeup recorded, Current Status moved to Phase 9 / next = feature 24), `context/ui-registry.md` (`ScriptCard`/`ContractCard` entries re-imprinted in place).

## Decisions made

- **Status transitions are reversible (draft ⇄ posted / draft ⇄ sent), not one-way** — a deliberate developer-driven divergence from `build-plan.md`'s original spec, decided during `/architect`. Reason: a mis-click otherwise needs manual Mongo surgery to undo, same logic as the calendar's Discard action. One route serves both directions per resource.
- **`ScriptCard`'s new status badge is always-shown** (mirrors `ContractCard`, not `EventItem`'s conditionally-rendered Pending badge) — the two cards are structural twins, and "draft" is a normal steady state, not transient.
- **No `ConfirmDialog` on the toggle** — nothing is destroyed and it's reversible, doesn't meet the bar `ConfirmDialog` is reserved for (real data loss, per `DocumentRow`'s precedent).
- **No new orchestrator intent / chat path** — dashboard-only, per the original scope.
- **Follow-up recorded, not built:** feature 22's briefing can eventually filter on real `status` instead of its 14-day recency cap, now that real transitions exist. The cap still does no harm (it's now redundant safety, not the only mechanism) — a candidate for a future polish pass, not scoped to any planned feature.

## Problems solved

- **Real bug, caught only by live double-click testing, not by `tsc` or a static read:** `handleToggleStatus` in both cards originally reset `isSubmitting` back to `false` only on the failure branch. Unlike `EventItem`'s Confirm/Discard (whose buttons vanish once `isProposed` flips false), this toggle button is always rendered and the card keeps the same component instance across a refetch — so after one successful toggle, the button stayed permanently disabled. Fixed by resetting `isSubmitting` unconditionally right after the request resolves.
- **Post-ship `/code-review` found 2 more real bugs in the refetch refactor** (both from the same root cause — the original mount-only fetch never needed guards that multi-trigger `onChange`-driven refetch now does): (1) an out-of-order response race — two overlapping GETs (e.g. toggling two cards fast) could resolve in dispatch-reversed order and silently revert a change that had already succeeded server-side; fixed with a `requestIdRef` counter that ignores a superseded response. (2) a transient background-refetch failure was flipping the *entire panel* to the full-screen error state, hiding every card even though the triggering write had persisted; fixed by reserving the full-screen error for genuine initial-load failures only (`hasLoadedRef`), showing a small inline note on a later blip instead.
- **Both fixes re-verified live via Playwright** using response-timing tricks (delay only response *delivery*, not the underlying request, so the DB read stays accurate to real dispatch time) rather than trusted on read-through alone.
- **Dev-environment gotcha discovered while writing the failure-test script: this app runs under React `StrictMode`, which double-invokes the mount effect in dev.** A naive request-count-based Playwright intercept can accidentally target half of that double-mount instead of the real toggle-triggered refetch — the fix was to let the initial load fully settle before attaching interception. Worth remembering for any future test written against this dev server.
- **Environment note, not a code issue:** this harness's default Bash sandbox blocks outbound TCP on MongoDB's port 27017 (HTTPS/443 still passes) — `dangerouslyDisableSandbox: true` is needed on any command reaching the real Atlas cluster or launching a real browser (Playwright) for live verification. A one-off transient Atlas TLS handshake failure (`SSL alert number 80`) also occurred once and resolved on a plain retry — unrelated to any code change.

## Current state

- **Feature 23 functionally complete and live-verified twice** — once for the original build (ticked in `progress-tracker.md`, committed by the developer as `d7608df`), and once more for the post-ship `/code-review` fix pass (server routes via `curl`, full Playwright click-throughs, and the actual loop-closing check: marked the real Velour contract "sent" through the UI and confirmed `npm run briefing:test` dropped it from the unfinished list).
- `tsc -b --noEmit` clean on both `server/` and `client/` throughout, including after the fix pass.
- **Uncommitted as of end of session:** `client/src/pages/ContractsPage.tsx`, `client/src/pages/ScriptsPage.tsx` (the race/blank-on-blip fixes), and `context/progress-tracker.md` (the writeup of that fix). Everything else for this feature is already committed. Developer said they're handling commits themselves — left as-is.
- All real database records touched during verification (a script briefly marked posted, the real Velour Cosmetics contract briefly marked sent) were restored to their original `draft` status afterward. No real data left altered.
- No dev servers left running; all scratch Playwright test files cleaned up.

## Next session starts with

**Feature 24 — Settings Panel**, per `build-plan.md`: WhatsApp briefing settings (time, which reminders on/off) persisted to `profile`, plus connected-accounts status (Instagram, YouTube, Google Calendar, WhatsApp). Run `/architect` first per the project's loop. Before starting, confirm with the developer whether the feature-23 uncommitted fixes have been committed.

## Open questions

- Whether/how to detect a silently-dropped Atlas Search index proactively — carried over from feature 18/20, still unaddressed.
- `@langchain/google` still pre-1.0 (0.2.x) — carried over, no action needed yet.
- Whether the dev/test Google Calendar gets swapped for Sofia's real shared calendar before production — carried over, unaddressed.
- Whether a self-explaining-disabled-control pattern should become a deliberate app-wide decision — carried over from feature 19, still undecided.
- Whether `ContractCard`'s duplicated download-link className should be extracted into a shared link-chip component — carried over from feature 20, still open.
- The `<select>` in `UploadDocumentForm` deviates slightly from `ui-tokens.md`'s Input spec — carried over from feature 21, not corrected in isolation.
- New: feature 22's briefing 14-day recency cap could eventually be replaced with a real `status`-based filter now that feature 23 exists — recorded as a future polish candidate, not scoped to any planned feature.
