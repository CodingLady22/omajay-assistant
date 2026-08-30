import { useCallback, useEffect, useRef, useState } from "react";
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
  const [refreshError, setRefreshError] = useState(false);

  // refetch is called both on mount and from every card's onChange (a status
  // toggle) — toggling two cards in quick succession can fire two overlapping
  // GET /api/scripts calls that resolve out of order. requestIdRef lets a
  // response recognize it's been superseded and ignore itself rather than
  // overwriting newer state with stale data.
  const requestIdRef = useRef(0);
  // Once the list has loaded successfully once, a later refetch failure (e.g.
  // a transient blip after a toggle) shouldn't blank an already-rendered list
  // the way an initial-load failure should — it keeps the existing cards and
  // surfaces a small inline note instead.
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(() => {
    const requestId = ++requestIdRef.current;
    getScripts().then((result) => {
      if (requestId !== requestIdRef.current) return;
      if (result.success) {
        setScripts(result.data);
        setState("ready");
        setRefreshError(false);
        hasLoadedRef.current = true;
      } else if (hasLoadedRef.current) {
        setRefreshError(true);
      } else {
        setState("error");
      }
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
      {refreshError && (
        <div className="mb-2 text-[12px] text-text-secondary">
          Couldn't refresh the list — showing the last loaded data.
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {scripts.map((script) => (
          <ScriptCard key={script._id} script={script} onChange={refetch} />
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
