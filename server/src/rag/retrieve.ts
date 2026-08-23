import { collections } from "@/db/collections";
import { logger } from "@/lib/logger";
import { embedQuery } from "@/rag/embeddings";

const VECTOR_INDEX_NAME = "documents_vector_index";
const NUM_CANDIDATES = 100;

// $vectorSearch has no built-in relevance cutoff — it always returns the k
// nearest chunks, even for a totally unrelated query, as long as ANY
// documents exist. Without a floor, "empty" would never fire once she's
// ingested anything, which defeats the "say so rather than guess" rule for a
// genuinely off-topic ask. Measured live against the real fixture corpus
// (feature 20): a genuine deal query ("Velour Cosmetics Summer Glow
// Collection...") scored 0.82/0.71/0.67 across the 3 fixture docs, while a
// domain-unrelated query ("Orbital Dynamics Aerospace...") scored only
// 0.58/0.58/0.57 — 0.6 sits cleanly in the ~0.07 gap between the lowest
// legitimate match and the highest irrelevant one.
const MIN_RELEVANCE_SCORE = 0.6;

type VectorSearchHit = { source: string; chunk: string; score: number };

// Two empty states that look identical from a zero-hit query but mean very
// different things: "empty" is an honest "nothing relevant on file" (the
// contracts agent should say so, per the hard grounding rule); "index_missing"
// is the Atlas Search index itself having disappeared (confirmed to happen on
// a shared-tier cluster pause/resume — see feature 18's progress-tracker.md
// entry) — a silent config problem that would otherwise look exactly like
// "empty" with no signal anything is wrong.
export type RetrievalResult =
  | { status: "ok"; chunks: string[]; sources: string[] }
  | { status: "empty" }
  | { status: "index_missing" };

// The mongodb driver's ListSearchIndexesCursor is typed as only { name: string
// } even though Atlas actually returns a fuller document including `queryable`
// (confirmed live during feature 18, polled until `queryable: true`) — the
// driver's declared type is just incomplete, not a runtime guarantee we're
// violating.
type SearchIndexStatus = { name: string; queryable?: boolean };

async function isIndexQueryable(): Promise<boolean> {
  try {
    const indexes = (await collections.documents().listSearchIndexes(VECTOR_INDEX_NAME).toArray()) as SearchIndexStatus[];
    const index = indexes[0];
    return Boolean(index?.queryable);
  } catch (error) {
    logger.error("rag/retrieve", "Failed to check vector search index status", error);
    return false;
  }
}

export async function retrieveContext(query: string, k: number): Promise<RetrievalResult> {
  const queryVector = await embedQuery(query);

  const results = await collections
    .documents()
    .aggregate<VectorSearchHit>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: NUM_CANDIDATES,
          limit: k,
        },
      },
      { $project: { _id: 0, source: 1, chunk: 1, score: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();

  const relevant = results.filter((hit) => hit.score >= MIN_RELEVANCE_SCORE);

  if (relevant.length === 0) {
    // Zero raw hits means the collection itself may be empty or the index
    // gone; zero hits surviving the relevance floor means real documents
    // exist but none are actually about this query — both read as "empty"
    // to the caller unless the index is confirmed missing.
    const queryable = await isIndexQueryable();
    return queryable ? { status: "empty" } : { status: "index_missing" };
  }

  return {
    status: "ok",
    chunks: relevant.map((hit) => hit.chunk),
    sources: [...new Set(relevant.map((hit) => hit.source))],
  };
}
