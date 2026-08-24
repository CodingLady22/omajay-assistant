import { Chip } from "@/components/common/Chip";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// First real use of --color-backdrop for a confirm modal — ui-tokens.md
// flagged this token specifically for "future confirm/approve modals
// (calendar add, DM send approval, contract review)" when it was added in
// feature 04; this is that first modal, built reusable for those later.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  isSubmitting = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-backdrop/40 p-4"
      onClick={() => !isSubmitting && onCancel()}
    >
      <div
        className="w-full max-w-[360px] rounded-lg border-[0.5px] border-border bg-surface p-4 shadow-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-[13px] font-medium text-text-primary">{title}</div>
        <div className="mt-1.5 text-[12px] leading-[1.55] text-text-secondary">{message}</div>
        {error && <div className="mt-2 text-[11px] text-text-secondary">{error}</div>}
        <div className="mt-3.5 flex justify-end gap-1.5">
          <Chip onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Chip>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-md bg-pink px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
