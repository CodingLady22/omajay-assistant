import { useNavigate } from "react-router-dom";
import type { Trend, TrendPlatform } from "@/lib/types";

type Props = {
  trend: Trend;
};

const PLATFORM_BADGE: Record<TrendPlatform, { label: string; className: string }> = {
  instagram: { label: "IG", className: "bg-ig-bg text-ig" },
  youtube: { label: "YT", className: "bg-yt-bg text-yt" },
  tiktok: { label: "TT", className: "bg-tt-bg text-tt" },
};

const PLATFORM_NAME: Record<TrendPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const PLATFORM_FALLBACK_BG: Record<TrendPlatform, string> = {
  instagram: "bg-ig-bg",
  youtube: "bg-yt-bg",
  tiktok: "bg-tt-bg",
};

export function TrendCard({ trend }: Props) {
  const navigate = useNavigate();
  const badge = PLATFORM_BADGE[trend.platform];
  const prompt = `Give me content ideas inspired by this trending post: "${trend.title}"`;

  return (
    <button
      type="button"
      onClick={() => navigate("/", { state: { prompt } })}
      className="overflow-hidden rounded-lg border-[0.5px] border-border bg-surface text-left transition-[border-color,box-shadow] hover:border-pink-mid hover:shadow-card-hover"
    >
      <div className={`relative h-22 ${trend.thumbnail ? "" : PLATFORM_FALLBACK_BG[trend.platform]}`}>
        {trend.thumbnail && <img src={trend.thumbnail} alt={trend.title} className="h-full w-full object-cover" />}
        <span
          className={`absolute top-2 right-2 rounded-full px-1.75 py-0.5 text-[10px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="px-2.75 py-2.25">
        <div className="mb-0.75 text-[10px] tracking-[0.08em] text-text-secondary uppercase">
          {PLATFORM_NAME[trend.platform]}
        </div>
        <div className="mb-1.25 line-clamp-2 text-xs leading-[1.35] font-medium text-text-primary">{trend.title}</div>
        <div className="text-[11px] text-pink">{trend.metric}</div>
      </div>
    </button>
  );
}
