import { getDb } from "@/db/client";
import { logger } from "@/lib/logger";

// Provisional — must match the embedding model chosen in feature 18 (RAG ingest).
// Update this one constant once the model is finalized (e.g. Voyage AI); a
// mismatch is not caught at insert time, only when Atlas rejects the query.
export const EMBEDDING_DIMENSIONS = 1024;

const VECTOR_INDEX_NAME = "documents_vector_index";

export async function createStandardIndexes(): Promise<void> {
  const db = getDb();

  await db.collection("trends").createIndex({ external_id: 1 }, { unique: true });
  await db.collection("dms").createIndex({ ig_thread_id: 1 }, { unique: true });
  await db.collection("events").createIndex({ start: 1 });
  await db.collection("contracts").createIndex({ brand: 1, status: 1 });

  logger.info("db/indexes", "Standard indexes ensured");
}

export async function createVectorSearchIndex(): Promise<void> {
  const db = getDb();

  const existingCollections = await db.listCollections({ name: "documents" }).toArray();
  if (existingCollections.length === 0) {
    await db.createCollection("documents");
  }

  const documents = db.collection("documents");

  const existing = await documents.listSearchIndexes(VECTOR_INDEX_NAME).toArray();
  if (existing.length > 0) {
    logger.info("db/indexes", `Vector search index "${VECTOR_INDEX_NAME}" already exists — skipping`);
    return;
  }

  await documents.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: EMBEDDING_DIMENSIONS,
          similarity: "cosine",
        },
      ],
    },
  });

  logger.info(
    "db/indexes",
    `Vector search index "${VECTOR_INDEX_NAME}" creation requested — builds asynchronously on Atlas, not immediately queryable`
  );
}
