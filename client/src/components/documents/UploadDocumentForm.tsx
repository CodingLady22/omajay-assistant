import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { uploadDocument } from "@/lib/api";
import type { DocType } from "@/lib/types";

type Props = {
  onUploaded?: () => void;
};

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "rate_card", label: "Rate card" },
  { value: "contract", label: "Past contract" },
];

export function UploadDocumentForm({ onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>("rate_card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const result = await uploadDocument(file, docType);
    setIsSubmitting(false);

    if (result.success) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded?.();
    } else {
      setError(result.error);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-col gap-2 rounded-md border-[0.5px] border-dashed border-border px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          disabled={isSubmitting}
          className="min-w-0 flex-1 text-[12px] text-text-secondary file:mr-2 file:rounded-md file:border-0 file:bg-pink-light file:px-2.5 file:py-1 file:text-[11px] file:text-pink"
        />
        <select
          value={docType}
          // Safe by construction, not by runtime narrowing: every <option> value
          // below is drawn from DOC_TYPE_OPTIONS, so the DOM's always-`string`
          // event.target.value can only ever actually be a DocType.
          onChange={(event) => setDocType(event.target.value as DocType)}
          disabled={isSubmitting}
          className="rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-[12px] text-text-primary focus:border-pink-mid"
        >
          {DOC_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-pink px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "Uploading…" : "Upload"}
        </button>
      </div>
      {error && <div className="text-[11px] text-text-secondary">{error}</div>}
    </form>
  );
}
