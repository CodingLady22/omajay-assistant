import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { EmptyExtractionError, extractText } from "@/rag/parse";
import { ingestDocument, listDocuments, removeDocument } from "@/rag/ingest";

const router = Router();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];

// The client's <input accept> is only a browser hint — anything can still
// reach this route directly. Rejected in multer's fileFilter (before the
// body is even buffered) rather than after ingest, so a disallowed file
// never gets a chance to become a real embedded chunk in the RAG corpus.
class UnsupportedFileTypeError extends Error {
  constructor(filename: string) {
    super(`Unsupported file type for "${filename}" — only PDF, .txt, and .md are accepted.`);
    this.name = "UnsupportedFileTypeError";
  }
}

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (hasAllowedExtension(file.originalname)) {
      cb(null, true);
    } else {
      cb(new UnsupportedFileTypeError(file.originalname));
    }
  },
});

// Runs multer as a promise instead of route middleware. multer failures
// (oversized file, a fileFilter rejection) happen before an Express route
// handler runs at all — as middleware, they'd skip this route's try/catch
// and fall through to Express's default HTML error handler, which leaks a
// raw stack trace with server filesystem paths to the client. Awaiting it
// inside the handler's own try/catch keeps every failure on the same
// { success, error } JSON path as the rest of this codebase.
function runUploadMiddleware(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const docTypeSchema = z.enum(["rate_card", "contract"]);
const sourceParamSchema = z.object({ source: z.string().min(1) });

router.get("/", async (_req: Request, res: Response) => {
  try {
    const documents = await listDocuments();
    return res.json({ success: true, data: documents });
  } catch (error) {
    logger.error("routes/documents", "Failed to list documents", error);
    return res.status(500).json({ success: false, error: "Failed to list documents" });
  }
});

router.post("/upload", async (req: Request, res: Response) => {
  try {
    await runUploadMiddleware(req, res);

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const docType = docTypeSchema.parse(req.body.doc_type);

    const text = await extractText(req.file.buffer, req.file.originalname);
    const chunkCount = await ingestDocument(docType, req.file.originalname, text);

    return res.json({ success: true, data: { source: req.file.originalname, chunk_count: chunkCount } });
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError || error instanceof EmptyExtractionError) {
      return res.status(422).json({ success: false, error: error.message });
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `File too large — max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`
          : `Upload failed: ${error.message}`;
      return res.status(400).json({ success: false, error: message });
    }
    logger.error("routes/documents", "Failed to upload document", error);
    return res.status(500).json({ success: false, error: "Failed to upload document" });
  }
});

router.delete("/:source", async (req: Request, res: Response) => {
  try {
    // req.params.source is already URL-decoded by Express — no manual decode needed.
    const { source } = sourceParamSchema.parse(req.params);
    const deletedCount = await removeDocument(source);
    if (deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    return res.json({ success: true, data: { deletedCount } });
  } catch (error) {
    logger.error("routes/documents", "Failed to delete document", error);
    return res.status(500).json({ success: false, error: "Failed to delete document" });
  }
});

export default router;
