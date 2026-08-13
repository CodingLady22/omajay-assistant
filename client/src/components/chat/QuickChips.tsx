import { Chip } from "@/components/common/Chip";

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
        <Chip key={chip} onClick={() => onSelect(chip)}>
          {chip}
        </Chip>
      ))}
    </div>
  );
}
