import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
};

export function ComingSoonPanel({ icon: Icon, label }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-[22px] py-[18px] text-center">
      <Icon size={28} className="text-text-secondary" />
      <div className="text-[13px] font-medium text-text-primary">{label} is coming soon</div>
      <div className="max-w-xs text-[12px] text-text-secondary">
        This panel hasn't been built yet — check back once it ships.
      </div>
    </div>
  );
}
