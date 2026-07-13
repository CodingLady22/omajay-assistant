const CHIPS = [
  "✨ What's trending?",
  "📝 Write me a Reel script",
  "📅 What's on my calendar?",
  "💌 Any brand DMs?",
];

type Props = {
  onSelect: (text: string) => void;
};

export function QuickChips({ onSelect }: Props) {
  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="rounded-full border border-border px-[11px] py-1 text-[11px] text-text-secondary transition-colors hover:border-pink-mid hover:bg-pink-light hover:text-pink"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
