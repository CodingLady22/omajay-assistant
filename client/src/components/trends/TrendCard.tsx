import { useNavigate } from "react-router-dom";
import type { Trend, TrendPlatform } from "@/lib/mock-trends";

type Props = {
  trend: Trend;
};

const PLATFORM_BADGE: Record<TrendPlatform, { label: string; className: string }> = {
  instagram: { label: "IG", className: "bg-ig-bg text-ig" },
  youtube: { label: "YT", className: "bg-yt-bg text-yt" },
};

export function TrendCard({ trend }: Props) {
  const navigate = useNavigate();
  const badge = PLATFORM_BADGE[trend.platform];

  return (
    <button
      type="button"
      onClick={() => navigate("/", { state: { prompt: trend.prompt } })}
      className="overflow-hidden rounded-lg border-[0.5px] border-border bg-surface text-left transition-[border-color,box-shadow] hover:border-pink-mid hover:shadow-card-hover"
    >
      <div className={`relative flex h-22 items-center justify-center text-3xl ${trend.thumbnailToken}`}>
        {trend.emoji}
        <span
          className={`absolute top-2 right-2 rounded-full px-1.75 py-0.5 text-[10px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="px-2.75 py-2.25">
        <div className="mb-0.75 text-[10px] tracking-[0.08em] text-text-secondary uppercase">
          {trend.formatLabel}
        </div>
        <div className="mb-1.25 text-xs leading-[1.35] font-medium text-text-primary">{trend.title}</div>
        <div className="text-[11px] text-pink">{trend.metric}</div>
      </div>
    </button>
  );
}
