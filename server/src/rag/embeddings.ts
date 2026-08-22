import { z } from "zod";
import { getEmbeddingEnv } from "@/lib/env";
import { sleep } from "@/lib/utils";

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3";

// Voyage accounts with no payment method on file are capped at 3 requests
// per minute (still get the model's free token allowance) — a single ingest
// run plus its verify query can easily exceed that, so 429s are retried with
// backoff rather than treated as a hard failure. Non-429 failures still
// throw immediately (see the comment on embed() below). 5 retries at 20s
// gives 80s of total backoff — verified live that a fresh 60s window isn't
// always enough headroom when the query call lands right after 3 back-to-back
// ingest calls have just used up the same window.
const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 20_000;

const voyageResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number(),
    })
  ),
});

type InputType = "document" | "query";

// Deliberately does NOT catch-and-degrade like services/youtube.ts's
// fetchTrendingVideos — a silently-dropped or malformed embedding would
// corrupt retrieval later with no signal. Same throw-on-failure reasoning as
// services/google-calendar.ts's createEvent. Callers own their own try/catch.
async function embed(texts: string[], inputType: InputType): Promise<number[][]> {
  const { EMBEDDING_API_KEY } = getEmbeddingEnv();

  for (let attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMBEDDING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, input_type: inputType }),
    });

    if (res.ok) {
      const parsed = voyageResponseSchema.parse(await res.json());
      return [...parsed.data].sort((a, b) => a.index - b.index).map((item) => item.embedding);
    }

    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const delayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : DEFAULT_RETRY_DELAY_MS;
      await sleep(delayMs);
      continue;
    }

    throw new Error(`Voyage AI embeddings request failed with status ${res.status}: ${await res.text()}`);
  }

  // Unreachable: every iteration above either returns or throws.
  throw new Error("Voyage AI embeddings request failed after rate-limit retries");
}

// input_type "document" — used when ingesting chunks into the vector store.
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}

// input_type "query" — used when retrieving (feature 20's rag/retrieve.ts).
// Voyage's asymmetric document/query embeddings improve retrieval quality
// over embedding both sides identically.
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  if (!vector) {
    throw new Error("Voyage AI returned no embedding for the query");
  }
  return vector;
}
