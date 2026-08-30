import { useCallback, useEffect, useState } from "react";
import { getContracts, getDocuments } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Contract, DocumentSummary } from "@/lib/types";
import { Chip } from "@/components/common/Chip";
import { ContractCard } from "@/components/contracts/ContractCard";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { UploadDocumentForm } from "@/components/documents/UploadDocumentForm";

type LoadState = "loading" | "error" | "ready";

export function ContractsPage() {
  const goToChat = useChatPrompt();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [documentsState, setDocumentsState] = useState<LoadState>("loading");

  const refetchDocuments = useCallback(() => {
    setDocumentsState("loading");
    getDocuments().then((result) => {
      if (result.success) {
        setDocuments(result.data);
        setDocumentsState("ready");
      } else {
        setDocumentsState("error");
      }
    });
  }, []);

  const refetchContracts = useCallback(() => {
    getContracts().then((result) => {
      if (result.success) {
        setContracts(result.data);
        setState("ready");
      } else {
        setState("error");
      }
    });
  }, []);

  useEffect(() => {
    refetchContracts();
  }, [refetchContracts]);

  useEffect(() => {
    refetchDocuments();
  }, [refetchDocuments]);

  // Documents render as their own section regardless of contracts state —
  // uploading source material is a prerequisite to drafting, not a sibling
  // concern, so it can't live behind a "no contracts yet" early return.
  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      {state === "loading" && (
        <div className="flex items-center justify-center py-6 text-[12px] text-text-secondary">
          Loading contracts…
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center justify-center py-6 text-[12px] text-text-secondary">
          Couldn't load contracts right now — try again in a moment.
        </div>
      )}

      {state === "ready" && contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="text-[12px] text-text-secondary">No contracts drafted yet.</div>
          <Chip onClick={() => goToChat("Draft a contract for a brand deal")}>✨ Draft a contract</Chip>
        </div>
      )}

      {state === "ready" && contracts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {contracts.map((contract) => (
            <ContractCard key={contract._id} contract={contract} onChange={refetchContracts} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 text-[13px] font-medium text-text-primary">Source Documents</div>
        <UploadDocumentForm onUploaded={refetchDocuments} />

        <div className="mt-2.5 flex flex-col gap-2">
          {documentsState === "loading" && (
            <div className="text-[12px] text-text-secondary">Loading documents…</div>
          )}
          {documentsState === "error" && (
            <div className="text-[12px] text-text-secondary">Couldn't load documents right now — try again in a moment.</div>
          )}
          {documentsState === "ready" && documents.length === 0 && (
            <div className="text-[12px] text-text-secondary">
              No documents uploaded yet — her rate cards and past contracts ground every draft.
            </div>
          )}
          {documentsState === "ready" &&
            documents.map((document) => (
              <DocumentRow key={document.source} document={document} onChange={refetchDocuments} />
            ))}
        </div>
      </div>
    </div>
  );
}
