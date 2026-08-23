import { useEffect, useState } from "react";
import { getContracts } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Contract } from "@/lib/types";
import { Chip } from "@/components/common/Chip";
import { ContractCard } from "@/components/contracts/ContractCard";

type LoadState = "loading" | "error" | "ready";

export function ContractsPage() {
  const goToChat = useChatPrompt();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    getContracts().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setContracts(result.data);
        setState("ready");
      } else {
        setState("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Loading contracts…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Couldn't load contracts right now — try again in a moment.
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 py-4.5 text-center">
        <div className="text-[12px] text-text-secondary">No contracts drafted yet.</div>
        <Chip onClick={() => goToChat("Draft a contract for a brand deal")}>✨ Draft a contract</Chip>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="flex flex-col gap-2.5">
        {contracts.map((contract) => (
          <ContractCard key={contract._id} contract={contract} />
        ))}
      </div>
    </div>
  );
}
