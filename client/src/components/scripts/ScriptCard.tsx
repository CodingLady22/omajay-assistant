import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import type { Script } from "@/lib/mock-scripts";

type Props = {
  script: Script;
};

function renderBody(script: Script): ReactElement | null {
  switch (script.kind) {
    case "reel":
      return (
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
      );
    case "caption":
      return <div className="text-xs leading-[1.65] text-text-secondary">{script.text}</div>;
    case "carousel":
      // No design mock or agreed layout for carousels yet (feature 11) — an explicit
      // placeholder so this never silently renders through the caption path instead.
      return <div className="text-xs italic leading-[1.65] text-text-secondary">Carousel rendering not yet implemented.</div>;
    default: {
      // Compile-time exhaustiveness guard only — `script` is never actually `never` at
      // runtime if untyped/real data ever sends an unrecognized `kind` (feature 11+).
      // Degrade to nothing rather than returning the raw object as a JSX child, which
      // would crash the render ("Objects are not valid as a React child").
      const exhaustiveCheck: never = script;
      console.error("[ScriptCard] unhandled script kind:", exhaustiveCheck);
      return null;
    }
  }
}

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
      {renderBody(script)}
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
