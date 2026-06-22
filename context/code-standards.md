# Code Standards

Implementation rules for the whole project. The AI agent follows these every session, no exceptions. They prevent pattern drift across sessions.

---

## Engineering Mindset

Operate as a senior engineer:

- **Think before implementing** — understand what and why before writing code.
- **Read context first** — verify against `architecture.md` and `project-overview.md`, never assume.
- **Scope is sacred** — build only what the current feature needs. No "while I'm here" extras.
- **Every feature must be testable** — if you can't verify it right after building, it's not done.
- **Clean over clever** — readable code a junior could follow beats a clever abstraction.
- **One thing at a time** — finish one feature fully before the next.
- **Failures are expected** — wrap external calls in try/catch, log them, never let one failure crash a run.

---

## TypeScript

- Strict mode on in `tsconfig.json` — no exceptions, across `server/` and `client/`.
- Never use `any` — use `unknown` and narrow.
- Never use type assertions (`as X`) unless unavoidable, with a comment explaining why.
- All function parameters and return types explicitly typed.
- Use `type` for object shapes and unions; `interface` only for extendable component props.
- Every async function has error handling — no floating promises.
- `const` by default; `let` only when reassignment is real.

---

## Backend Conventions (Node + Express)

- Express with the App Router-style separation: thin routes, logic in agents/services.
- Route files in `server/routes/` — parse request, call one agent node or service, return the response wrapper. No reasoning in routes.
- Agent logic in `server/agents/` only. Never in routes, never in services.
- Third-party API calls in `server/services/` only. Services don't reason and don't make LLM calls.
- All LLM calls go through `server/lib/llm.ts`. Never import a provider SDK (`@langchain/google-genai` now; `@langchain/anthropic` / `@langchain/openai` later) anywhere else.
- All MongoDB access through typed accessors in `server/db/collections.ts`. Never reach into a raw collection from a route or agent.
- Always read library docs / skills before using a third-party API — versions drift from training data. See `library-docs.md`.

---

## API Response Shape

Every route returns the same wrapper:

```typescript
// success
return res.json({ success: true, data: result });

// failure
return res.status(500).json({ success: false, error: "Human readable message" });
```

- Every route handler has a try/catch.
- Every route validates its request body with zod before processing.
- Errors logged with a route prefix: `[routes/contracts]`.
- Never return raw data without the `{ success, data?, error? }` wrapper.
- Never expose raw error messages or internals to the client.

```typescript
// server/routes/contracts.ts
import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

const draftSchema = z.object({
  brand: z.string().min(1),
  dealSummary: z.string().min(1),
});

router.post("/draft", async (req: Request, res: Response) => {
  try {
    const body = draftSchema.parse(req.body);
    const result = await runContractsAgent(body);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[routes/contracts]", error);
    return res.status(500).json({ success: false, error: "Failed to draft contract" });
  }
});

export default router;
```

---

## Agent Nodes (LangGraph)

```typescript
// server/agents/trends-agent.ts
import { AgentState } from "@/agents/state";

export async function trendsAgent(state: AgentState): Promise<Partial<AgentState>> {
  try {
    // read stored trends, optionally trigger a scan
    return { response: text };
  } catch (error) {
    await logAgentError(state.runId, error);
    return { response: "Couldn't pull trends right now — try again in a moment." };
  }
}
```

- Each node is a pure function `(state) => Partial<state>`.
- Each node has a try/catch and returns a safe fallback response on failure — never throws into the graph.
- Errors logged to `agent_logs` before returning.
- Nodes never import from `routes/` or `client/`.
- Nodes never call a provider SDK directly — only `lib/llm.ts`.
- A node never performs an irreversible side effect (send DM, write calendar event) without an explicit approval flag in state.

---

## Services (Third-Party Clients)

```typescript
// server/services/youtube.ts
export async function fetchTrendingMakeupVideos(): Promise<YouTubeTrend[]> {
  try {
    // call YouTube Data API
    return results;
  } catch (error) {
    console.error("[services/youtube]", error);
    return [];
  }
}
```

- Services wrap exactly one third-party API.
- Services return typed data or an empty/typed-fallback on failure — never throw up to the caller unhandled.
- Services never make LLM calls and never contain agent reasoning.
- TikTok service always returns `[]` until real API access — never fake data.
- All tokens come from `lib/env.ts` (env vars) — never hardcoded, never from the DB.

---

## LLM Usage

All LLM calls go through one place. Provider is Gemini for now — free tier, good for development and testing. Before production, Anthropic and OpenAI get added as fallback providers (the client hasn't decided which they'll prefer), so `lib/llm.ts` must keep the provider swappable without any agent file knowing which one is active:

```typescript
// server/lib/llm.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getLlmEnv } from "@/lib/env";

export const llm = new ChatGoogleGenerativeAI({
  apiKey: getLlmEnv().GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.3,
});
```

- Model string and provider set once here — never scattered, never imported elsewhere.
- Default temperature 0.3 (routing, classification, summaries). Use 0.7 only for creative script generation, set per-call.
- Structured output: ask for JSON, validate with zod, never trust raw output.
- Never import a provider SDK (`@langchain/google-genai`, and later `@langchain/anthropic` / `@langchain/openai`) outside this file.
- **Before production:** add Anthropic and OpenAI as fallback providers — LangChain's `.withFallbacks()` on a Runnable is the natural fit for "if one provider is down, the next carries on." Verify the current API against official docs when this is actually built, per this file's own rule of checking library docs before implementing. Until then, only Gemini is wired up.

---

## MongoDB Usage

```typescript
// server/db/collections.ts
import { db } from "@/db/client";
import type { Trend, ScriptDoc, Dm } from "@/types";

export const collections = {
  profile: () => db.collection("profile"),
  trends: () => db.collection<Trend>("trends"),
  scripts: () => db.collection<ScriptDoc>("scripts"),
  dms: () => db.collection<Dm>("dms"),
  // ...
};
```

- Every collection accessed through `collections.*` — never `db.collection("...")` inline elsewhere.
- Always handle the result — never assume a write succeeded.
- Use upserts with a stable dedupe key for scanned data (trends `external_id`, dms `ig_thread_id`).
- Even though single-user, keep queries scoped and typed so multi-user is a clean future change.

---

## Error Handling

- Never empty catch blocks — always log or handle.
- Console errors always carry a context prefix: `[folder/name]`.
- User-facing errors are human readable — never raw error text.
- Agent errors go to `agent_logs` — never surfaced raw to WhatsApp or the dashboard.
- A failed third-party call degrades gracefully (e.g. "couldn't reach Instagram right now") — it never crashes the message handler.

---

## Autonomy and Safety Rules

These are product rules enforced in code:

- **DMs agent never sends.** It writes `draft_reply`. Sending is a separate route that requires an explicit approval payload.
- **Calendar agent never writes directly.** `calendar_add` creates a `proposed` event; a separate approval route writes it to Google Calendar.
- **Only the morning briefing is autonomous outbound.** No other code path messages Sofia unprompted.
- **Contracts grounded in retrieval only.** The contracts agent uses retrieved `documents` chunks for every rate and term. If retrieval is empty, it says so — it never invents numbers.

---

## File and Folder Naming

- Folders: kebab-case — `trends-agent`, `google-calendar`.
- React components: PascalCase — `ChatPanel.tsx`, `TrendCard.tsx`.
- Backend modules: kebab-case — `trends-agent.ts`, `morning-briefing.ts`.
- Types files: `types.ts` / `index.ts`.
- One component per file. Named exports only — never default exports for components.

---

## React Component Structure

```typescript
// 1. External imports
import { useState } from "react";

// 2. Internal imports
import { api } from "@/lib/api";

// 3. Props type directly above the component
type Props = {
  threadId: string;
};

// 4. Component — named export
export function DmItem({ threadId }: Props) {
  // state → derived values → handlers → JSX
}
```

- No inline styles — Tailwind classes with project tokens only.
- Client-side data fetching goes through `client/src/lib/api.ts` — never raw `fetch` scattered in components.
- No browser storage APIs unless explicitly required.

---

## Import Aliases

Use `@/` — never relative imports going up more than one level. Configure the alias in both `server/tsconfig.json` and `client/tsconfig.json` / Vite.

```typescript
// Correct
import { llm } from "@/lib/llm";
import { TrendCard } from "@/components/trends/TrendCard";

// Never
import { llm } from "../../../lib/llm";
```

---

## Comments

- No comments explaining *what* — code should be self-explanatory.
- Comments only for *why* — a non-obvious decision.
- Agent nodes may carry a short comment explaining the strategy.
- No TODO comments in committed code.

---

## Dependencies

Never install a package without a clear reason. Before installing, check: is it already covered by LangChain/LangGraph, a native Node API, or an existing dep?

Approved dependencies:

- `@langchain/langgraph` — graph orchestration
- `@langchain/core` — primitives
- `@langchain/google-genai` — Gemini, current LLM provider (used only in `lib/llm.ts`)
- `@langchain/anthropic`, `@langchain/openai` — planned production fallback providers; not installed yet, add only when actually wired into `lib/llm.ts`
- `express` — REST server
- `mongodb` — database + GridFS + Atlas Vector Search
- `zod` — validation
- `pdf-lib` — contract PDFs
- `node-cron` — scheduling
- `googleapis` — Google Calendar
- `axios` or native `fetch` — HTTP to WhatsApp / Instagram / YouTube
- React, Vite, Tailwind v4 — frontend
- `lucide-react` — dashboard icons

Do not add other packages without updating this list first.

---

## Environment Variables

All env vars are parsed through `server/lib/env.ts` with zod — never read `process.env` directly anywhere else. Never hardcode a key, token, or URL. Validation is grouped, not all-or-nothing:

- **Core** (`env`) — validated eagerly, at module load, before the server boots. The process refuses to start if any are missing. Reserved for vars every feature depends on, regardless of which features are built yet.
- **Per-service** (`getLlmEnv()`, `getWhatsAppEnv()`, `getInstagramEnv()`, `getYouTubeEnv()`, `getGoogleCalendarEnv()`, `getEmbeddingEnv()`) — validated lazily, the first time the code that needs that integration actually calls its getter. The result is memoized after the first call. A feature should only require its own credentials once it's built and in use — earlier features shouldn't be blocked by env vars a later, unbuilt feature will eventually need.

Both paths go through the same `parseEnv` / `lazyEnv` helpers in `lib/env.ts` — adding a new integration means adding one more lazy getter there, not a new ad-hoc parsing block elsewhere.

| Variable                      | Group           | Used In                       |
| ----------------------------- | --------------- | ------------------------------ |
| `PORT`                        | core            | lib/env.ts                    |
| `MONGODB_URI`                 | core            | db/client.ts                  |
| `GEMINI_API_KEY`              | llm (lazy)      | lib/llm.ts                    |
| `WHATSAPP_TOKEN`              | whatsapp (lazy) | services/whatsapp.ts          |
| `WHATSAPP_PHONE_ID`           | whatsapp (lazy) | services/whatsapp.ts          |
| `WHATSAPP_VERIFY_TOKEN`       | whatsapp (lazy) | routes/whatsapp.ts (webhook)  |
| `INSTAGRAM_TOKEN`             | instagram (lazy)| services/instagram.ts         |
| `INSTAGRAM_ACCOUNT_ID`        | instagram (lazy)| services/instagram.ts         |
| `YOUTUBE_API_KEY`             | youtube (lazy)  | services/youtube.ts           |
| `GOOGLE_CALENDAR_CREDENTIALS` | google-calendar (lazy) | services/google-calendar.ts |
| `EMBEDDING_API_KEY`           | embeddings (lazy) | rag/embeddings.ts           |

> **Note:** `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` aren't in this table yet — they get added (as their own lazy groups) once Anthropic and OpenAI are wired in as fallback providers before production. See the Model note in `architecture.md` and the LLM Usage section above.

Frontend env vars (Vite) are prefixed `VITE_` and contain no secrets — only the API base URL.
