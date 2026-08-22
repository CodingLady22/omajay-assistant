import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collections } from "@/db/collections";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";
import { embedQuery } from "@/rag/embeddings";
import { ingestDocument, type DocType } from "@/rag/ingest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../fixtures/documents");

const MANIFEST: { file: string; docType: DocType }[] = [
  { file: "rate-card.md", docType: "rate_card" },
  { file: "contract-velour.md", docType: "contract" },
  { file: "contract-glosswear.md", docType: "contract" },
];

const VECTOR_INDEX_NAME = "documents_vector_index";
const VERIFY_QUERY = "What does Sofia charge for a single Instagram Reel?";
const EXPECTED_SOURCE = "rate-card.md";
const VERIFY_MAX_ATTEMPTS = 15;
const VERIFY_RETRY_DELAY_MS = 2000;

type VectorSearchHit = { source: string; chunk: string; score: number };

// Proves retrieval is actually CORRECT, not just non-empty — a mis-wired
// embedding model or index can still return results, just the wrong ones.
// Atlas Vector Search also indexes asynchronously after an insert, so a
// short retry loop absorbs that lag instead of failing on a race.
async function verifyRetrieval(): Promise<void> {
  const queryVector = await embedQuery(VERIFY_QUERY);

  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt++) {
    const results = await collections
      .documents()
      .aggregate<VectorSearchHit>([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: 50,
            limit: 3,
          },
        },
        { $project: { _id: 0, source: 1, chunk: 1, score: { $meta: "vectorSearchScore" } } },
      ])
      .toArray();

    const top = results[0];
    if (top?.source === EXPECTED_SOURCE) {
      logger.info(
        "rag/run-ingest",
        `Retrieval check PASSED — "${EXPECTED_SOURCE}" correctly returned as the top result for "${VERIFY_QUERY}"`,
        { score: top.score }
      );
      return;
    }

    if (attempt === VERIFY_MAX_ATTEMPTS) {
      throw new Error(
        `Retrieval check FAILED after ${VERIFY_MAX_ATTEMPTS} attempts: expected top result from "${EXPECTED_SOURCE}", ` +
          `got "${top?.source ?? "no results"}" — the embedding/index is likely mis-wired, not just empty.`
      );
    }

    logger.info(
      "rag/run-ingest",
      `Top result not yet "${EXPECTED_SOURCE}" (attempt ${attempt}/${VERIFY_MAX_ATTEMPTS}, got "${top?.source ?? "no results"}") — ` +
        "Atlas Vector Search indexes asynchronously, retrying..."
    );
    await sleep(VERIFY_RETRY_DELAY_MS);
  }
}

async function main(): Promise<void> {
  await connectToDatabase();

  for (const { file, docType } of MANIFEST) {
    const text = readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
    const count = await ingestDocument(docType, file, text);
    logger.info("rag/run-ingest", `"${file}" -> ${count} chunk(s)`);
  }

  await verifyRetrieval();
}

main()
  .catch((error) => {
    logger.error("rag/run-ingest", "Ingest run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
