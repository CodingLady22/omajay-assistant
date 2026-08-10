import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTrends } from "@/lib/api";
import type { Trend } from "@/lib/types";
import { TrendCard } from "@/components/trends/TrendCard";

type LoadState = "loading" | "error" | "ready";

export function TrendsPage() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    getTrends().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setTrends(result.data);
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
        Loading trends…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Couldn't load trends right now — try again in a moment.
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 py-4.5 text-center">
        <div className="text-[12px] text-text-secondary">No trends scanned yet.</div>
        <button
          type="button"
          onClick={() => navigate("/", { state: { prompt: "What's trending?" } })}
          className="rounded-full border border-border px-[11px] py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink"
        >
          ✨ What's trending?
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-3">
        {trends.map((trend) => (
          <TrendCard key={trend.external_id} trend={trend} />
        ))}
      </div>
    </div>
  );
}
