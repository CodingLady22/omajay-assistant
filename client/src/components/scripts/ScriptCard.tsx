import { useNavigate } from "react-router-dom";
import type { Script } from "@/lib/mock-scripts";

type Props = {
  script: Script;
};

export function ScriptCard({ script }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-text-primary">{script.title}</div>
        <span className="shrink-0 rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
          {script.badgeLabel}
        </span>
      </div>
      {script.kind === "reel" ? (
        <div className="text-xs leading-[1.65] text-text-secondary">
          <div>
            <span className="font-medium text-text-primary">Hook (0–3s):</span> {script.hook}
          </div>
          <div className="mt-1">
            <span className="font-medium text-text-primary">Body:</span> {script.body}
          </div>
          <div className="mt-1">
            <span className="font-medium text-text-primary">CTA:</span> {script.cta}
          </div>
        </div>
      ) : (
        <div className="text-xs leading-[1.65] text-text-secondary">{script.text}</div>
      )}
      <button
        type="button"
        onClick={() => navigate("/", { state: { prompt: script.actionPrompt } })}
        className="mt-2.5 rounded-full border border-border px-[11px] py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink"
      >
        {script.actionLabel}
      </button>
    </div>
  );
}
