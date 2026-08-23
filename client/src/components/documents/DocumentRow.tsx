import { useState } from "react";
import { Chip } from "@/components/common/Chip";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { deleteDocument } from "@/lib/api";
import type { DocumentSummary, DocType } from "@/lib/types";

type Props = {
  document: DocumentSummary;
  onChange?: () => void;
};

const DOC_TYPE_LABEL: Record<DocType, string> = {
  rate_card: "Rate card",
  contract: "Past contract",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DocumentRow({ document, onChange }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);
    const result = await deleteDocument(document.source);
    if (result.success) {
      setConfirmOpen(false);
      setIsSubmitting(false);
      onChange?.();
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-md border-[0.5px] border-border bg-surface px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-[13px] font-medium text-text-primary">{document.source}</div>
          <span className="shrink-0 rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
            {DOC_TYPE_LABEL[document.doc_type]}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-text-secondary">
          Uploaded {formatDate(document.uploaded_at)} · {document.chunk_count} chunk
          {document.chunk_count === 1 ? "" : "s"}
        </div>
      </div>
      <Chip onClick={() => setConfirmOpen(true)}>Delete</Chip>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${document.source}"?`}
        message="This removes it from what grounds her contract drafts. Any past draft that already used it keeps its saved terms — this only affects future retrieval."
        confirmLabel="Delete"
        isSubmitting={isSubmitting}
        error={error}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
