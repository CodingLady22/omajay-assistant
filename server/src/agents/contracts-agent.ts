import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections } from "@/db/collections";
import { downloadPdf, uploadPdf } from "@/db/gridfs";
import { llm } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { extractJson } from "@/lib/utils";
import { retrieveContext } from "@/rag/retrieve";
import { renderContractPdf } from "@/services/pdf";
import type { AgentState } from "@/agents/state";
import type { ContractDoc, ContractStatus, ContractTerms } from "@/types";

const RETRIEVAL_K = 6;

// --- Deal extraction (chat path only — POST /api/contracts/draft skips this,
// same relationship calendar-agent.ts's proposeEvent has to confirmProposedEvent) ---

const DEAL_EXTRACTION_PROMPT = `You extract contract-drafting details from a message asking to draft, review, or send a contract, for a makeup/beauty content creator's assistant.

Extract:
- brand: the brand or company name the contract is with
- dealSummary: a short description of the deal in her own words (deliverables, campaign name, or any specifics she mentioned) — do NOT invent deliverables, numbers, or terms she didn't mention; if she only names the brand with no other detail, a generic phrase like "collaboration" is fine

If you cannot confidently determine the brand name, respond with null for brand.

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{"brand": "..." or null, "dealSummary": "..." or null}`;

const dealExtractionSchema = z.object({
  brand: z.string().nullable(),
  dealSummary: z.string().nullable(),
});

type DealExtraction = z.infer<typeof dealExtractionSchema>;

async function extractDealDetails(message: string): Promise<DealExtraction> {
  const result = await llm.invoke([
    { role: "system", content: DEAL_EXTRACTION_PROMPT },
    { role: "user", content: message },
  ]);
  const raw = typeof result.content === "string" ? result.content : String(result.content);
  return dealExtractionSchema.parse(JSON.parse(extractJson(raw)));
}

const CLARIFICATION_MESSAGE =
  "I couldn't tell which brand this contract is for — try again naming the brand and what the deal includes.";

// --- Drafting (grounded-only) ---

const DRAFT_SYSTEM_PROMPT = `You are Sofia's contracts drafting assistant for her makeup/beauty influencer business.

You are given the brand, a description of the deal, and reference material retrieved from her own rate card and past contracts. This reference material is the ONLY source of truth for rates and terms — you must NEVER invent, guess, average, or estimate a number, rate, or clause that isn't stated in it.

Some reference chunks are her general rate card (applies to any brand). Others are a PAST CONTRACT WITH A SPECIFIC BRAND (look for a "Brand:" line) — only use a past contract's figures if its brand matches the brand given for THIS deal. If a reference chunk is a past contract for a different brand, ignore its figures entirely, even if nothing else covers that field.

For each field below, find the matching rate/term in the reference material and use it VERBATIM (the same wording and figures, not paraphrased or recalculated). If the reference material does not cover a field, respond with null for that field.

Fields:
- deliverables: an array of {"name": ..., "rate": ... or null} — one entry per deliverable mentioned in the deal description, with "rate" being the matching per-deliverable rate from the reference material, or null if no matching rate is stated
- totalFee: the overall contract fee, ONLY if a total figure is explicitly stated in the reference material — otherwise null
- paymentTerms: the payment schedule (deposit / net terms), or null
- usageRights: usage rights terms, or null
- exclusivity: exclusivity terms, or null
- timeline: delivery/posting timeline, or null
- revisions: revision terms, or null

Respond with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{"deliverables": [{"name": "...", "rate": "..." or null}], "totalFee": "..." or null, "paymentTerms": "..." or null, "usageRights": "..." or null, "exclusivity": "..." or null, "timeline": "..." or null, "revisions": "..." or null}`;

// Mirrors the ContractTerms type in types/index.ts — same convention as
// calendar-agent.ts's eventExtractionSchema/EventExtraction pair.
const contractTermsSchema = z.object({
  deliverables: z.array(z.object({ name: z.string(), rate: z.string().nullable() })),
  totalFee: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  usageRights: z.string().nullable(),
  exclusivity: z.string().nullable(),
  timeline: z.string().nullable(),
  revisions: z.string().nullable(),
});

function buildDraftPrompt(brand: string, dealSummary: string, chunks: string[]): string {
  const reference = chunks.map((chunk, index) => `--- Reference ${index + 1} ---\n${chunk}`).join("\n\n");
  return `Brand: ${brand}\nDeal description: ${dealSummary}\n\nReference material:\n${reference}`;
}

async function draftTerms(brand: string, dealSummary: string, chunks: string[]): Promise<ContractTerms> {
  const result = await llm.invoke([
    { role: "system", content: DRAFT_SYSTEM_PROMPT },
    { role: "user", content: buildDraftPrompt(brand, dealSummary, chunks) },
  ]);
  const raw = typeof result.content === "string" ? result.content : String(result.content);
  return contractTermsSchema.parse(JSON.parse(extractJson(raw)));
}

// --- Draft, store, and read back ---

export type DraftContractResult =
  | { status: "ok"; contract: ContractDoc }
  | { status: "empty" }
  | { status: "index_missing" };

// Shared by the chat node (after extraction) and POST /api/contracts/draft
// (structured body, no extraction) — same split as calendar-agent.ts's
// proposeEvent vs. confirmProposedEvent being independently callable.
export async function draftContract(brand: string, dealSummary: string): Promise<DraftContractResult> {
  const retrieval = await retrieveContext(`${brand} ${dealSummary}`, RETRIEVAL_K);
  if (retrieval.status !== "ok") {
    return retrieval;
  }

  const terms = await draftTerms(brand, dealSummary, retrieval.chunks);
  const pdfBuffer = await renderContractPdf({ brand, dealSummary, terms });
  const pdfFileId = await uploadPdf(`${brand}-${Date.now()}.pdf`, pdfBuffer);

  const now = new Date();
  const doc: ContractDoc = {
    brand,
    deal_summary: dealSummary,
    terms,
    pdf_path: pdfFileId,
    sources: retrieval.sources,
    status: "draft",
    created_at: now,
  };

  const inserted = await collections.contracts().insertOne(doc);
  return { status: "ok", contract: { ...doc, _id: inserted.insertedId } };
}

export async function getStoredContracts(): Promise<ContractDoc[]> {
  return collections.contracts().find({}).sort({ created_at: -1 }).toArray();
}

export async function getContractPdf(contractId: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const contract = await collections.contracts().findOne({ _id: new ObjectId(contractId) });
  if (!contract) return null;
  const buffer = await downloadPdf(contract.pdf_path);
  return { buffer, filename: `${contract.brand}-contract.pdf` };
}

// Reversible on purpose (draft <-> sent) — same feature-23 /architect
// decision as content-agent.ts's setScriptStatus, diverging from
// build-plan.md's original one-way spec for the same undo-without-Mongo-
// surgery reason.
export async function setContractStatus(id: string, status: ContractStatus): Promise<ContractDoc | null> {
  const updated = await collections
    .contracts()
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { status } }, { returnDocument: "after" });
  return updated ?? null;
}

// --- Chat node ---

export async function contractsAgent(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const extraction = await extractDealDetails(state.input);
    if (!extraction.brand || !extraction.dealSummary) {
      return { response: CLARIFICATION_MESSAGE };
    }

    const result = await draftContract(extraction.brand, extraction.dealSummary);

    if (result.status === "index_missing") {
      logger.error("agents/contracts-agent", "Vector search index missing during contract draft");
      return {
        response:
          "I can't reach your rate card right now — the document index may be missing. Ask your developer to run `db:setup-search-index`.",
      };
    }

    if (result.status === "empty") {
      return {
        response: `I don't have any rate card or past contract info on file for ${extraction.brand} yet, so there's nothing to ground a draft in.`,
      };
    }

    return {
      response: `Drafted a contract for ${extraction.brand} — grounded in your rate card and past deals. Head to the Contracts tab to review and download the PDF.`,
    };
  } catch (error) {
    logger.error("agents/contracts-agent", "Failed to draft contract", error);
    return { response: "Couldn't draft that contract right now — try again in a moment." };
  }
}
