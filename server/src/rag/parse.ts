import { PDFParse } from "pdf-parse";

// Below this many non-whitespace characters, treat extraction as having
// failed rather than ingesting a near-empty document — catches scanned/
// image-only PDFs (no embedded text layer, out of scope: that's OCR) so she
// gets a clear error instead of a document that silently grounds nothing.
const MIN_EXTRACTED_CHARS = 20;

export class EmptyExtractionError extends Error {
  constructor(filename: string, isPdf: boolean) {
    const hint = isPdf ? " — it may be a scanned image with no text layer" : "";
    super(`Couldn't read any text from "${filename}"${hint}.`);
    this.name = "EmptyExtractionError";
  }
}

function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// Picks extraction by file extension, not the browser-reported MIME type
// (.md is reported inconsistently across browsers/OSes). .pdf goes through
// pdf-parse; anything else (.txt, .md) is treated as UTF-8 text directly.
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const pdf = isPdf(filename);
  const text = pdf ? await extractPdfText(buffer, filename) : buffer.toString("utf-8");

  if (text.trim().length < MIN_EXTRACTED_CHARS) {
    throw new EmptyExtractionError(filename, pdf);
  }

  return text;
}
