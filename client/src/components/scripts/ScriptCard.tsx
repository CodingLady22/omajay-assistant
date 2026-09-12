import { useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useChatPrompt } from "@/lib/useChatPrompt";
import { setScriptStatus } from "@/lib/api";
import type { Script, ScriptStatus } from "@/lib/types";
import { Chip } from "@/components/common/Chip";

type Props = {
  script: Script;
  onChange?: () => void;
};

const KIND_LABEL: Record<Script["kind"], string> = {
  reel: "Reel",
  caption: "IG Post",
  carousel: "Carousel",
};

// Same neutral bg-info-bg/text-info treatment as the kind badge next to it —
// the DM pink/green pair stays reserved for DM classification only.
const STATUS_LABEL: Record<ScriptStatus, string> = {
  draft: "Draft",
  posted: "Posted",
};

function actionFor(script: Script): { label: string; prompt: string } {
  if (script.kind === "reel") {
    return { label: "Expand script ↗", prompt: `Expand this Reel script with on-screen text suggestions: "${script.title}"` };
  }
  if (script.kind === "caption") {
    return { label: "Get more variations ↗", prompt: `Write 3 more variations of this caption: "${script.title}"` };
  }
  return { label: "Expand idea ↗", prompt: `Turn this carousel idea into a full script: "${script.title}"` };
}

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
      return (
        <div className="flex flex-col gap-1.5 text-xs leading-[1.65] text-text-secondary">
          {script.variants.map((variant, index) => (
            <div key={index}>
              <span className="font-medium text-text-primary">Option {index + 1}:</span> {variant}
            </div>
          ))}
        </div>
      );
    case "carousel":
      // No design mock or agreed layout for carousels yet (feature 11 scoped
      // content-agent to reel + caption only) — an explicit placeholder so this
      // never silently renders through another kind's path instead.
      return <div className="text-xs italic leading-[1.65] text-text-secondary">Carousel rendering not yet implemented.</div>;
    default: {
      // Compile-time exhaustiveness guard only — `script` is never actually `never` at
      // runtime if untyped/real data ever sends an unrecognized `kind`. Degrade to
      // nothing rather than returning the raw object as a JSX child, which would
      // crash the render ("Objects are not valid as a React child").
      const exhaustiveCheck: never = script;
      console.error("[ScriptCard] unhandled script kind:", exhaustiveCheck);
      return null;
    }
  }
}

export function ScriptCard({ script, onChange }: Props) {
  const goToChat = useChatPrompt();
  const navigate = useNavigate();
  const action = actionFor(script);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carries the whole script (not just a prompt string) — a richer payload
  // than useChatPrompt handles, so this is a separate small navigate call
  // rather than extending that hook. ChatPanel reads `editScript` from
  // location.state to enter its locked script-editing mode.
  function goToEdit(): void {
    if (!script._id) return;
    navigate("/", { state: { editScript: script } });
  }

  const nextStatus: ScriptStatus = script.status === "draft" ? "posted" : "draft";
  const toggleLabel = script.status === "draft" ? "Mark posted" : "Mark as draft";

  // Reversible on purpose (see content-agent.ts's setScriptStatus) — a
  // mis-click can always be undone from the card itself.
  async function handleToggleStatus() {
    if (!script._id) return;
    setIsSubmitting(true);
    setError(null);
    const result = await setScriptStatus(script._id, nextStatus);
    // Always reset, success or failure — unlike EventItem's Confirm/Discard
    // (which vanish once isProposed flips false), this card keeps the same
    // key/instance across a refetch, so a success-only reset would leave the
    // button permanently disabled after the first successful toggle.
    setIsSubmitting(false);
    if (result.success) {
      onChange?.();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-text-primary">{script.title}</div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
            {STATUS_LABEL[script.status]}
          </span>
          <span className="rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
            {KIND_LABEL[script.kind]}
          </span>
        </div>
      </div>
      {renderBody(script)}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {script.kind !== "carousel" && <Chip onClick={goToEdit}>Edit ✎</Chip>}
        <Chip onClick={() => goToChat(action.prompt)}>{action.label}</Chip>
        <Chip onClick={handleToggleStatus} disabled={isSubmitting}>
          {toggleLabel}
        </Chip>
      </div>
      {/* No dedicated error/danger token exists yet — matches the plain-secondary-text
          error convention EventItem already established ahead of feature 25's unified
          error-styling pass. */}
      {error && <div className="mt-1.5 text-[11px] text-text-secondary">{error}</div>}
    </div>
  );
}
