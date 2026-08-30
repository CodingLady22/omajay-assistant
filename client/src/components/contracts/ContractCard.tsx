import { useState } from "react";
import { API_BASE_URL, setContractStatus } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Contract, ContractStatus } from "@/lib/types";
import { Chip } from "@/components/common/Chip";

type Props = {
  contract: Contract;
  onChange?: () => void;
};

const STATUS_LABEL: Record<Contract["status"], string> = {
  draft: "Draft",
  sent: "Sent",
};

// Same visual chip, rendered as a real download link — Chip itself only
// wraps a <button>, so this is inlined rather than forking the component.
const DOWNLOAD_LINK_CLASSNAME =
  "rounded-full border border-border px-2.75 py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink";

export function ContractCard({ contract, onChange }: Props) {
  const goToChat = useChatPrompt();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus: ContractStatus = contract.status === "draft" ? "sent" : "draft";
  const toggleLabel = contract.status === "draft" ? "Mark sent" : "Mark as draft";

  // Reversible on purpose (see contracts-agent.ts's setContractStatus) — a
  // mis-click can always be undone from the card itself.
  async function handleToggleStatus() {
    if (!contract._id) return;
    setIsSubmitting(true);
    setError(null);
    const result = await setContractStatus(contract._id, nextStatus);
    // Always reset, success or failure — same reasoning as ScriptCard's
    // handleToggleStatus (see its comment): this card keeps the same
    // key/instance across a refetch, unlike EventItem's Confirm/Discard.
    setIsSubmitting(false);
    if (result.success) {
      onChange?.();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-text-primary">{contract.brand}</div>
        <span className="shrink-0 rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
          {STATUS_LABEL[contract.status]}
        </span>
      </div>
      <div className="text-xs leading-[1.65] text-text-secondary">{contract.deal_summary}</div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <a href={`${API_BASE_URL}/api/contracts/${contract._id}/pdf`} className={DOWNLOAD_LINK_CLASSNAME}>
          Download PDF
        </a>
        <Chip onClick={() => goToChat(`Help me edit the terms of the ${contract.brand} contract`)}>Edit terms ↗</Chip>
        <Chip onClick={handleToggleStatus} disabled={isSubmitting}>
          {toggleLabel}
        </Chip>
      </div>
      {/* No dedicated error/danger token exists yet — matches the plain-secondary-text
          error convention EventItem already established ahead of feature 25's unified
          error-styling pass. */}
      {error && <div className="mt-1.5 text-[11px] text-text-secondary">{error}</div>}
    </div>
  );
}
