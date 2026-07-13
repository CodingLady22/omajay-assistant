import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, Settings } from "lucide-react";
import { findRoute } from "@/lib/routes";

type Props = {
  onOpenMobileNav: () => void;
};

export function Topbar({ onOpenMobileNav }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const route = findRoute(location.pathname);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-[22px] py-[14px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary sm:hidden"
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>
        <div className="font-display text-[17px] text-text-primary">
          {route?.titleBase}
          <span className="italic text-pink">{route?.titleAccent}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Search"
        >
          <Search size={14} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
