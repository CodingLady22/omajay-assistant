import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Contract } from "@/lib/mock-contracts";
import { Chip } from "@/components/common/Chip";

type Props = {
  contract: Contract;
};

const STATUS_LABEL: Record<Contract["status"], string> = {
  draft: "Draft",
  sent: "Sent",
};

export function ContractCard({ contract }: Props) {
  const goToChat = useChatPrompt();

  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-text-primary">{contract.brand}</div>
        <span className="shrink-0 rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
          {STATUS_LABEL[contract.status]}
        </span>
      </div>
      <div className="text-xs leading-[1.65] text-text-secondary">{contract.dealSummary}</div>
      <div className="mt-2.5 flex gap-1.5">
        <Chip disabled title="Coming once contracts can generate a real PDF (feature 20)">
          Download PDF
        </Chip>
        <Chip onClick={() => goToChat(contract.editPrompt)}>Edit terms ↗</Chip>
      </div>
    </div>
  );
}
