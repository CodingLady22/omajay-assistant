import { draftContract, getStoredContracts } from "@/agents/contracts-agent";
import { downloadPdf, deletePdf } from "@/db/gridfs";
import { collections } from "@/db/collections";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { logger } from "@/lib/logger";

// Proves grounding is actually CORRECT, not just present — a mis-prompted
// LLM could produce plausible-sounding-but-wrong numbers and still pass a
// shallow "some rate exists" check. This asserts the drafted terms match the
// real fixture figures verbatim (contract-velour.md: $6,200 total, 50%/Net 15
// payment, organic-only usage, no exclusivity, 3-week timeline) — same bar
// feature 18 used for its topically-correct-chunk check, one level deeper.
// Cleans up the created Mongo row + GridFS file either way.

function assertContains(label: string, value: string | null, expected: string): void {
  if (!value || !value.toLowerCase().includes(expected.toLowerCase())) {
    throw new Error(`Grounding check FAILED for "${label}": expected to contain "${expected}", got "${value ?? "null"}"`);
  }
  logger.info("agents/run-contracts-test", `Grounding check PASSED for "${label}": "${value}"`);
}

async function testGroundedDraft(): Promise<void> {
  const result = await draftContract(
    "Velour Cosmetics",
    "Summer Glow Collection Launch — 2 Instagram Reels, 1 Instagram Feed Post, 4-frame Instagram Story Set"
  );

  if (result.status !== "ok") {
    throw new Error(`Expected a successful draft, got status "${result.status}"`);
  }

  const { terms, sources, pdf_path, _id } = result.contract;

  try {
    if (!sources.includes("contract-velour.md")) {
      throw new Error(`Expected retrieval sources to include "contract-velour.md", got ${JSON.stringify(sources)}`);
    }
    logger.info("agents/run-contracts-test", "VERIFIED: retrieval grounded in contract-velour.md", { sources });

    assertContains("totalFee", terms.totalFee, "$6,200");
    assertContains("paymentTerms", terms.paymentTerms, "Net 15");
    assertContains("usageRights", terms.usageRights, "Organic");
    assertContains("exclusivity", terms.exclusivity, "None");
    assertContains("timeline", terms.timeline, "3 weeks");

    const pdfBuffer = await downloadPdf(pdf_path);
    if (pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("Stored GridFS file is not a valid PDF (missing %PDF- header)");
    }
    logger.info("agents/run-contracts-test", `VERIFIED: PDF stored in GridFS, ${pdfBuffer.length} bytes`);

    const stored = await getStoredContracts();
    if (!stored.some((contract) => contract._id?.toString() === _id?.toString())) {
      throw new Error("Drafted contract not found via getStoredContracts()");
    }
    logger.info("agents/run-contracts-test", "VERIFIED: contract readable back via getStoredContracts()");
  } finally {
    await deletePdf(pdf_path).catch((error: unknown) => {
      logger.error("agents/run-contracts-test", "Failed to clean up GridFS file", error);
    });
    if (_id) {
      await collections.contracts().deleteOne({ _id });
    }
    logger.info("agents/run-contracts-test", "Cleaned up test contract (Mongo row + GridFS file)");
  }
}

async function testEmptyRetrieval(): Promise<void> {
  // Deliberately outside the beauty/influencer domain entirely (not just a
  // different brand) so cosine similarity against the rate card / past
  // contracts falls below MIN_RELEVANCE_SCORE, not merely a different topic
  // within the same domain vocabulary (which could still score deceptively high).
  const result = await draftContract(
    "Orbital Dynamics Aerospace",
    "Satellite propulsion system software licensing agreement"
  );
  if (result.status !== "empty") {
    throw new Error(`Expected status "empty" for a domain-unrelated brand, got "${result.status}"`);
  }
  logger.info("agents/run-contracts-test", 'VERIFIED: a domain-unrelated brand correctly returns status "empty", nothing drafted');
}

async function main(): Promise<void> {
  await connectToDatabase();
  await testGroundedDraft();
  await testEmptyRetrieval();
}

main()
  .catch((error) => {
    logger.error("agents/run-contracts-test", "Contracts test run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
