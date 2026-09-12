import { Chip } from "@/components/common/Chip";

type Props = {
  title: string;
  onSave: () => void;
  onDiscard: () => void;
  busy: boolean;
  error: string | null;
};

export function ScriptEditBanner({ title, onSave, onDiscard, busy, error }: Props) {
  return (
    <div className="mb-2 rounded-md border-[0.5px] border-border bg-surface-secondary px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-text-primary">Editing: {title}</div>
          <div className="text-[11px] text-text-secondary">Tell me what to change — I'll revise it each turn.</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="rounded-md bg-pink px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
          <Chip onClick={onDiscard} disabled={busy}>
            Discard
          </Chip>
        </div>
      </div>
      {/* No dedicated error/danger token exists yet — matches the plain-secondary-text
          error convention EventItem/ScriptCard/ContractCard already established. */}
      {error && <div className="mt-1.5 text-[11px] text-text-secondary">{error}</div>}
    </div>
  );
}
