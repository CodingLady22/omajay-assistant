import { MOCK_TRENDS } from "@/lib/mock-trends";
import { TrendCard } from "@/components/trends/TrendCard";

export function TrendsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-3">
        {MOCK_TRENDS.map((trend) => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </div>
    </div>
  );
}
