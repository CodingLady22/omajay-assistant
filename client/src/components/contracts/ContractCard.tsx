import { API_BASE_URL } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Contract } from "@/lib/types";
import { Chip } from "@/components/common/Chip";

type Props = {
  contract: Contract;
};

const STATUS_LABEL: Record<Contract["status"], string> = {
  draft: "Draft",
  sent: "Sent",
};

// Same visual chip, rendered as a real download link — Chip itself only
// wraps a <button>, so this is inlined rather than forking the component.
const DOWNLOAD_LINK_CLASSNAME =
  "rounded-full border border-border px-2.75 py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink";

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
      <div className="text-xs leading-[1.65] text-text-secondary">{contract.deal_summary}</div>
      <div className="mt-2.5 flex gap-1.5">
        <a href={`${API_BASE_URL}/api/contracts/${contract._id}/pdf`} className={DOWNLOAD_LINK_CLASSNAME}>
          Download PDF
        </a>
        <Chip onClick={() => goToChat(`Help me edit the terms of the ${contract.brand} contract`)}>Edit terms ↗</Chip>
      </div>
    </div>
  );
}
