import { MOCK_CONTRACTS } from "@/lib/mock-contracts";
import { ContractCard } from "@/components/contracts/ContractCard";

export function ContractsPage() {
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
