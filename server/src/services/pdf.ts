import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { ContractTerms } from "@/types";

type ContractPdfInput = {
  brand: string;
  dealSummary: string;
  terms: ContractTerms;
};

const PAGE_MARGIN = 50;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_BODY = 10.5;
const LINE_HEIGHT = 15;
const NOT_ON_FILE = "Not on file — not covered by her retrieved rate card or past contracts.";

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Renders a clean, plain-text PDF meant to be opened and tweaked by her in
// any PDF editor before sending — no form fields, no interactivity. Content
// is drawn top-down with automatic page breaks; layout stays simple on
// purpose (see library-docs.md's pdf-lib rules).
export async function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage();
  let { width, height } = page.getSize();
  let y = height - PAGE_MARGIN;
  const contentWidth = width - PAGE_MARGIN * 2;

  function ensureSpace(linesNeeded: number): void {
    if (y - linesNeeded * LINE_HEIGHT < PAGE_MARGIN) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      y = height - PAGE_MARGIN;
    }
  }

  function drawTitle(text: string): void {
    ensureSpace(2);
    page.drawText(text, { x: PAGE_MARGIN, y, size: FONT_SIZE_TITLE, font: bold });
    y -= LINE_HEIGHT * 2;
  }

  function drawHeading(text: string): void {
    ensureSpace(2);
    page.drawText(text, { x: PAGE_MARGIN, y, size: FONT_SIZE_HEADING, font: bold });
    y -= LINE_HEIGHT * 1.4;
  }

  function drawField(label: string, value: string | null): void {
    const lines = wrapText(`${label}: ${value ?? NOT_ON_FILE}`, font, FONT_SIZE_BODY, contentWidth);
    ensureSpace(lines.length);
    for (const line of lines) {
      page.drawText(line, { x: PAGE_MARGIN, y, size: FONT_SIZE_BODY, font });
      y -= LINE_HEIGHT;
    }
    y -= LINE_HEIGHT * 0.4;
  }

  drawTitle(`Contract — ${input.brand}`);
  drawField("Deal", input.dealSummary);

  drawHeading("Deliverables");
  if (input.terms.deliverables.length === 0) {
    drawField("Deliverables", null);
  } else {
    for (const deliverable of input.terms.deliverables) {
      drawField(deliverable.name, deliverable.rate);
    }
  }

  drawHeading("Terms");
  drawField("Total Fee", input.terms.totalFee);
  drawField("Payment Terms", input.terms.paymentTerms);
  drawField("Usage Rights", input.terms.usageRights);
  drawField("Exclusivity", input.terms.exclusivity);
  drawField("Timeline", input.terms.timeline);
  drawField("Revisions", input.terms.revisions);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
