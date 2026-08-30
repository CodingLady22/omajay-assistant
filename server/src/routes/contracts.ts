import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { draftContract, getContractPdf, getStoredContracts, setContractStatus } from "@/agents/contracts-agent";
import { logger } from "@/lib/logger";

const router = Router();

const draftSchema = z.object({
  brand: z.string().min(1),
  dealSummary: z.string().min(1),
});

const idParamSchema = z.object({ id: z.string().min(1) });
const statusBodySchema = z.object({ status: z.enum(["draft", "sent"]) });

router.post("/draft", async (req: Request, res: Response) => {
  try {
    const { brand, dealSummary } = draftSchema.parse(req.body);
    const result = await draftContract(brand, dealSummary);

    if (result.status === "index_missing") {
      return res
        .status(503)
        .json({ success: false, error: "Document index unavailable — run `db:setup-search-index`." });
    }
    if (result.status === "empty") {
      return res.status(404).json({ success: false, error: `No rate card or past contract info on file for ${brand}.` });
    }
    return res.json({ success: true, data: result.contract });
  } catch (error) {
    logger.error("routes/contracts", "Failed to draft contract", error);
    return res.status(500).json({ success: false, error: "Failed to draft contract" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const contracts = await getStoredContracts();
    return res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error("routes/contracts", "Failed to fetch contracts", error);
    return res.status(500).json({ success: false, error: "Failed to fetch contracts" });
  }
});

router.post("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusBodySchema.parse(req.body);
    const contract = await setContractStatus(id, status);
    if (!contract) {
      return res.status(404).json({ success: false, error: "Contract not found" });
    }
    return res.json({ success: true, data: contract });
  } catch (error) {
    logger.error("routes/contracts", "Failed to update contract status", error);
    return res.status(500).json({ success: false, error: "Failed to update contract status" });
  }
});

router.get("/:id/pdf", async (req: Request, res: Response) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const pdf = await getContractPdf(id);
    if (!pdf) {
      return res.status(404).json({ success: false, error: "Contract not found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    return res.send(pdf.buffer);
  } catch (error) {
    logger.error("routes/contracts", "Failed to fetch contract PDF", error);
    return res.status(500).json({ success: false, error: "Failed to fetch contract PDF" });
  }
});

export default router;
