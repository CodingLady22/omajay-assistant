import { FileText } from "lucide-react";
import { MOCK_CONTRACTS } from "@/lib/mock-contracts";
import { ContractCard } from "@/components/contracts/ContractCard";

export function ContractsPage() {
  if (MOCK_CONTRACTS.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 py-4.5 text-center">
        <FileText size={28} className="text-text-secondary" />
        <div className="text-[12px] text-text-secondary">No contracts yet.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="flex flex-col gap-2.5">
        {MOCK_CONTRACTS.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    </div>
  );
}
