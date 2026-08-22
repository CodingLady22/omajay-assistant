import { collections } from "@/db/collections";
import { logger } from "@/lib/logger";
import { embedDocuments } from "@/rag/embeddings";
import type { DocumentChunk } from "@/types";

export type DocType = DocumentChunk["doc_type"];

const CHUNK_WORD_TARGET = 375; // ~500 tokens

// Splits on paragraph boundaries, greedily packing paragraphs into chunks up
// to CHUNK_WORD_TARGET words. A single paragraph longer than the target is
// hard-split by words rather than left oversized.
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  let current: string[] = [];
  let currentWordCount = 0;

  const flush = (): void => {
    if (current.length > 0) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentWordCount = 0;
    }
  };

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    if (words.length > CHUNK_WORD_TARGET) {
      flush();
      for (let i = 0; i < words.length; i += CHUNK_WORD_TARGET) {
        chunks.push(words.slice(i, i + CHUNK_WORD_TARGET).join(" "));
      }
      continue;
    }
    if (currentWordCount + words.length > CHUNK_WORD_TARGET) {
      flush();
    }
    current.push(paragraph);
    currentWordCount += words.length;
  }
  flush();

  return chunks;
}

// Reusable, exported — called by this feature's ingest script AND (feature
// 21) the real document-upload route, not written as script-local logic.
// Idempotent: removes any existing chunks for `source` first, so re-running
// ingest on the same document never accumulates duplicates (same convention
// as trends' upsert-on-external_id).
export async function ingestDocument(docType: DocType, source: string, text: string): Promise<number> {
  await removeDocument(source);

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return 0;
  }

  const embeddings = await embedDocuments(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error(`Embedding count (${embeddings.length}) did not match chunk count (${chunks.length}) for "${source}"`);
  }

  const now = new Date();
  const rows: DocumentChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    if (chunk === undefined || embedding === undefined) {
      throw new Error(`Unexpected missing chunk/embedding at index ${i} for "${source}"`);
    }
    rows.push({ doc_type: docType, source, chunk, embedding, created_at: now });
  }

  await collections.documents().insertMany(rows);
  logger.info("rag/ingest", `Ingested ${rows.length} chunk(s) from "${source}"`);
  return rows.length;
}

// Reusable, exported — feature 21's delete flow calls this directly.
export async function removeDocument(source: string): Promise<number> {
  const result = await collections.documents().deleteMany({ source });
  return result.deletedCount;
}
