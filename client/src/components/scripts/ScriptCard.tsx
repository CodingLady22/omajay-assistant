import type { ReactElement } from "react";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Script } from "@/lib/types";
import { Chip } from "@/components/common/Chip";

type Props = {
  script: Script;
};

const KIND_LABEL: Record<Script["kind"], string> = {
  reel: "Reel",
  caption: "IG Post",
  carousel: "Carousel",
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

export function ScriptCard({ script }: Props) {
  const goToChat = useChatPrompt();
  const action = actionFor(script);

  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-text-primary">{script.title}</div>
        <span className="shrink-0 rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">
          {KIND_LABEL[script.kind]}
        </span>
      </div>
      {renderBody(script)}
      <Chip className="mt-2.5" onClick={() => goToChat(action.prompt)}>
        {action.label}
      </Chip>
    </div>
  );
}
