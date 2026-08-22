export type ContractStatus = "draft" | "sent";

export type Contract = {
  id: string;
  brand: string;
  dealSummary: string;
  status: ContractStatus;
  editPrompt: string;
};

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: "velour-summer-2026",
    brand: "Velour Cosmetics",
    dealSummary: "Summer Glow Collection — 2 Reels, 1 Feed Post, 4-frame Story Set. $6,200, organic usage only.",
    status: "sent",
    editPrompt: "Help me edit the terms of the Velour Cosmetics summer campaign contract",
  },
  {
    id: "glosswear-holiday-2025",
    brand: "Glosswear Beauty",
    dealSummary: "Holiday Capsule Collection — 1 YouTube Integration, 1 Reel, 30 days paid social usage. $8,100.",
    status: "sent",
    editPrompt: "Help me edit the terms of the Glosswear Beauty holiday capsule contract",
  },
  {
    id: "lumiere-evening-2026",
    brand: "Lumière Beauty",
    dealSummary: "Evening ritual campaign — 1 Reel, 1 Feed Post featuring the overnight serum. Terms still being finalized.",
    status: "draft",
    editPrompt: "Help me edit the terms of the Lumière Beauty evening ritual contract",
  },
];
