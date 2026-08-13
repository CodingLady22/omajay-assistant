import { useEffect, useState } from "react";
import { getScripts } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { Script } from "@/lib/types";
import { Chip } from "@/components/common/Chip";
import { ScriptCard } from "@/components/scripts/ScriptCard";

type LoadState = "loading" | "error" | "ready";

export function ScriptsPage() {
  const goToChat = useChatPrompt();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    getScripts().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setScripts(result.data);
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
        Loading scripts…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Couldn't load scripts right now — try again in a moment.
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 py-4.5 text-center">
        <div className="text-[12px] text-text-secondary">No scripts yet.</div>
        <Chip onClick={() => goToChat("Write me a Reel script based on this week's trends")}>
          + Generate new idea ↗
        </Chip>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="flex flex-col gap-2.5">
        {scripts.map((script) => (
          <ScriptCard key={script._id} script={script} />
        ))}
      </div>
      <Chip
        className="mt-2.5"
        onClick={() => goToChat("Generate a new Reel script idea based on this week's trends")}
      >
        + Generate new idea ↗
      </Chip>
    </div>
  );
}
