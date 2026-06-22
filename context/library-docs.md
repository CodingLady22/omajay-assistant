# Library Docs

Project-specific usage patterns for every third-party library here. This covers how *this* project uses each tool — not general docs.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

1. **Check for a skill or MCP server.** The skills in this project (`/architect`, `/remember`, `/review`, `/recover`, `/imprint`) are *workflow* skills, not library-API references — see `AGENTS.md`. If a library-specific skill or MCP server is configured (e.g. a MongoDB or Google Calendar MCP), use it before general knowledge.
2. **Read this file** for project rules that override general knowledge.
3. **Verify current APIs** — when in doubt, check official docs. These APIs change often.

Order of authority:

```
MCP server (real-time docs) → Library-specific skills/MCP → This file (project rules) → General training knowledge
```

Never rely on training knowledge alone for library APIs — they change often.

---

## LangGraph.js

**Check first:** Any LangGraph-specific skill or MCP, then official LangGraph.js docs — the graph API differs from training data.

### The Graph

One orchestrator routes to one specialist node per message. State is shared and typed.

```typescript
// server/agents/state.ts
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  input: Annotation<string>,
  channel: Annotation<"whatsapp" | "web">,
  intent: Annotation<string>,
  response: Annotation<string>,
  runId: Annotation<string>,
  approval: Annotation<boolean>, // set true only by an explicit approval route
});

export type AgentState = typeof AgentState.State;
```

```typescript
// server/agents/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "@/agents/state";

const graph = new StateGraph(AgentState)
  .addNode("orchestrator", orchestrator)
  .addNode("trends", trendsAgent)
  .addNode("content", contentAgent)
  .addNode("calendar", calendarAgent)
  .addNode("dms", dmsAgent)
  .addNode("contracts", contractsAgent)
  .addEdge(START, "orchestrator")
  .addConditionalEdges("orchestrator", routeByIntent, {
    trends: "trends",
    content: "content",
    calendar_read: "calendar",
    calendar_add: "calendar",
    dms: "dms",
    contract: "contracts",
    smalltalk: "content",
  })
  .addEdge("trends", END)
  .addEdge("content", END)
  .addEdge("calendar", END)
  .addEdge("dms", END)
  .addEdge("contracts", END);

export const app = graph.compile();
```

**Rules:**

- One specialist node runs per message — no fan-out.
- The briefing agent is **not** in this graph — it's called directly by the scheduler.
- Every node returns `Partial<AgentState>` with at least `response`.
- The router reads `state.intent` set by the orchestrator — never re-classifies.
- Never add an intent without updating `architecture.md`, the orchestrator prompt, and the conditional edges together.

---

## Gemini via @langchain/google-genai

**Check first:** Official `@langchain/google-genai` docs for current model strings and message API.

Gemini is the LLM provider for now — it has a free tier that's good for development and testing. Before production, Anthropic and OpenAI get added as fallback providers (the client hasn't decided which they'll prefer), so `lib/llm.ts` stays the only file that knows which provider is active.

Single client in `lib/llm.ts` (see `code-standards.md`). Use it for:

### Intent Classification (orchestrator)

```typescript
const result = await llm.invoke([
  { role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT },
  { role: "user", content: state.input },
]);
// parse one intent label from the fixed set; default to "smalltalk"
```

### Structured Output

```typescript
// Ask for JSON, validate with zod
const raw = await llm.invoke([...]);
const parsed = ScriptSchema.parse(JSON.parse(extractJson(raw.content)));
```

**Rules:**

- Model string and provider live only in `lib/llm.ts`.
- Temperature 0.3 default; 0.7 for `content-agent` script generation (pass per-call).
- Always validate structured output with zod — never trust raw text.
- Keep classification prompts tight and closed — the orchestrator returns one label, nothing else.

**Before production — multi-provider fallback:**

- Add Anthropic (`@langchain/anthropic`) and OpenAI (`@langchain/openai`) alongside Gemini so a single provider outage doesn't take the assistant down. LangChain's `.withFallbacks([...])` on a Runnable is the natural fit for "try provider A, fall back to B, then C" — verify the current API against official docs when this is actually built, same as every other library in this file.
- Which provider(s) the client ultimately prefers isn't decided yet — keep all three wired and swappable rather than picking a permanent favorite now.
- This must stay invisible to agent code: agents call the exported `llm` exactly as they do today; only `lib/llm.ts` changes.

---

## WhatsApp Cloud API (Meta)

**Check first:** Meta WhatsApp Cloud API docs — endpoints and versions change.

This is the primary interface. Two halves: a webhook to receive, a send function to reply.

### Webhook (receive)

```typescript
// server/routes/whatsapp.ts
// GET — verification handshake
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST — incoming message
router.post("/", async (req, res) => {
  try {
    verifyMetaSignature(req); // ALWAYS verify before processing
    const message = parseWhatsAppMessage(req.body);
    if (message) {
      const result = await app.invoke({
        input: message.text,
        channel: "whatsapp",
        runId: crypto.randomUUID(),
      });
      await sendWhatsApp(message.from, result.response);
    }
    return res.sendStatus(200); // ack fast
  } catch (error) {
    console.error("[routes/whatsapp]", error);
    return res.sendStatus(200); // never make Meta retry on our error
  }
});
```

### Send

```typescript
// server/services/whatsapp.ts
export async function sendWhatsApp(to: string, text: string): Promise<void> {
  await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
```

### Send a document (contract PDF)

```typescript
// Upload the PDF to WhatsApp media, then send by media id — see Meta media docs.
// Used when delivering a drafted contract.
```

**Rules:**

- Always verify Meta's signature on POST before processing.
- Always reply `200` to the webhook quickly, even on internal error — otherwise Meta retries.
- The verify token is `WHATSAPP_VERIFY_TOKEN`; the send token is `WHATSAPP_TOKEN` — different things, never mix.
- Keep replies WhatsApp-friendly: short, plain text, no markdown tables.

---

## Instagram Graph API

**Check first:** Instagram Graph API docs — messaging + hashtag permissions change often.

Two uses: reading DMs, and finding trending posts. Requires an Instagram **Business** account connected to a Facebook Page, with messaging permissions approved.

### DMs

```typescript
// server/services/instagram.ts
export async function fetchRecentDms(): Promise<RawDm[]> {
  // GET /{ig-account-id}/conversations?fields=participants,messages{message,from}
  // returns recent threads; map to RawDm
}
```

### Trending posts (hashtag)

```typescript
export async function fetchHashtagTopPosts(hashtag: string): Promise<RawPost[]> {
  // 1. GET /ig_hashtag_search?user_id=...&q={hashtag} → hashtag id
  // 2. GET /{hashtag-id}/top_media?user_id=... → top posts
}
```

**Rules:**

- DMs are **read** here — classification and drafting happen in the dms-agent, sending is a separate approved action.
- Cache fetched DMs in the `dms` collection with `ig_thread_id` as the upsert key.
- Hashtag insights need a Business account — handle the permission-denied case gracefully.
- Token from `INSTAGRAM_TOKEN`, account id from `INSTAGRAM_ACCOUNT_ID` — env only.

---

## YouTube Data API v3

**Check first:** YouTube Data API v3 docs for current quota costs and params.

```typescript
// server/services/youtube.ts
export async function fetchTrendingMakeupVideos(): Promise<YouTubeTrend[]> {
  // GET /search?part=snippet&q=makeup tutorial&type=video&order=viewCount
  //   &publishedAfter={7 days ago}&maxResults=10&key={YOUTUBE_API_KEY}
  // then GET /videos?part=statistics&id=... for view counts
}
```

**Rules:**

- Use `order=viewCount` and a recent `publishedAfter` window for "trending".
- Two calls: search for ids, then `videos` for statistics — batch the ids.
- Key from `YOUTUBE_API_KEY` — env only.
- Mind quota — the daily scan should be efficient (one search + one stats call).

---

## TikTok — STUB

TikTok is out of scope until the client has Research API access.

```typescript
// server/services/tiktok.ts
export async function fetchTrendingTikToks(): Promise<TikTokTrend[]> {
  return []; // until API access — never fabricate data
}
```

**Rules:**

- Always returns `[]`. The trends agent must handle an empty TikTok result as normal.
- When access arrives, implement here only — no other file should need changing.

---

## Google Calendar API

**Check first:** If a Google Calendar MCP connector is configured, prefer it. Otherwise the `googleapis` calendar docs.

```typescript
// server/services/google-calendar.ts
import { google } from "googleapis";

export async function listUpcomingEvents(days = 14): Promise<CalendarEvent[]> {
  // calendar.events.list with timeMin=now, timeMax=now+days
}

export async function createEvent(event: NewEvent): Promise<string> {
  // calendar.events.insert — returns the new event id
  // CALLED ONLY from the approval route, never from the agent directly
}
```

**Rules:**

- Reading is free; the calendar agent reads whenever asked.
- **Creating is gated.** `createEvent` is called only from the approval route after Sofia confirms a `proposed` event — never from `calendar-agent.ts` directly.
- Credentials from `GOOGLE_CALENDAR_CREDENTIALS` — env only.

---

## MongoDB + Atlas Vector Search (RAG)

**Check first:** If a MongoDB MCP is configured, use it for index/schema work. Atlas Vector Search syntax changes — verify against current docs.

### Ingest (rate cards + contracts)

```typescript
// server/rag/ingest.ts
// 1. read the document text
// 2. chunk to ~500 tokens
// 3. embed each chunk
// 4. insert { doc_type, source, chunk, embedding } into `documents`
```

### Vector index (one-time)

```typescript
// server/db/indexes.ts
// create an Atlas Vector Search index on documents.embedding
// dimensions must match the embedding model
```

### Retrieve

```typescript
// server/rag/retrieve.ts
export async function retrieveContext(query: string, k = 6): Promise<string[]> {
  const queryEmbedding = await embed(query);
  const results = await collections.documents().aggregate([
    {
      $vectorSearch: {
        index: "documents_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: k,
      },
    },
  ]).toArray();
  return results.map((r) => r.chunk);
}
```

**Rules:**

- The contracts agent uses retrieved chunks as the **only** source of rates and terms.
- If retrieval returns nothing relevant, the agent tells Sofia it has no matching rate/term on file — it never invents one.
- Embedding model is set once in `rag/embeddings.ts`; index dimensions must match it.
- Keep `documents` private — it's her commercial data. Never expose chunks to the frontend except inside a finished contract draft.

---

## pdf-lib (Contract PDFs)

**Check first:** Official pdf-lib docs for the current drawing API.

```typescript
// server/services/pdf.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function renderContractPdf(contract: ContractData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  // draw title, parties, deliverables, rates, terms — clean single document
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
```

**Rules:**

- The PDF is meant to be **editable by her** — keep the layout simple and clean so she can adjust in any PDF editor before sending.
- Store the rendered PDF in GridFS; save the file id to `contracts.pdf_path`.
- Server-side only — never render PDFs in the frontend.
- Deliver to WhatsApp as a document message; expose to the dashboard via `GET /api/contracts/:id/pdf`.

---

## node-cron (Scheduling)

**Check first:** node-cron docs for cron syntax and timezone option support.

```typescript
// server/jobs/scheduler.ts
import cron from "node-cron";

export function registerJobs(): void {
  // daily trends scan — early morning
  cron.schedule("0 6 * * *", runDailyTrendsScan, { timezone: profileTimezone });
  // morning briefing — at profile.briefing_time
  cron.schedule("0 8 * * *", runMorningBriefing, { timezone: profileTimezone });
}
```

**Rules:**

- Two jobs only: daily trends scan and morning briefing.
- The morning briefing is the only autonomous outbound message — it calls `briefing-agent` then `sendWhatsApp`.
- Schedule times come from `profile.briefing_time` / `profile.timezone` — not hardcoded in production.
- Each job wraps its work in try/catch and logs to `agent_logs` — a failed job never crashes the server.
