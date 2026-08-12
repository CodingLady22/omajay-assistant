import { useNavigate } from "react-router-dom";
import { MOCK_SCRIPTS } from "@/lib/mock-scripts";
import { ScriptCard } from "@/components/scripts/ScriptCard";

export function ScriptsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <div className="flex flex-col gap-2.5">
        {MOCK_SCRIPTS.map((script) => (
          <ScriptCard key={script.id} script={script} />
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          navigate("/", { state: { prompt: "Generate a new Reel script idea based on this week's trends" } })
        }
        className="mt-2.5 rounded-full border border-border px-[11px] py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink"
      >
        + Generate new idea ↗
      </button>
    </div>
  );
}
