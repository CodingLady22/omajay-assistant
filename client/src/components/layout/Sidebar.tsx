import { NavLink } from "react-router-dom";
import { routes } from "@/lib/routes";

type Props = {
  isMobileOpen: boolean;
  onClose: () => void;
};

const GROUPS = ["Workspace", "Comms"] as const;

export function Sidebar({ isMobileOpen, onClose }: Props) {
  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-backdrop/40 sm:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-shrink-0 flex-col border-r border-border bg-surface-secondary transition-transform duration-200 sm:static sm:z-auto sm:w-16 sm:translate-x-0 lg:w-[220px] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-border px-[18px] py-[22px] sm:px-2 sm:py-4 lg:px-[18px] lg:py-[22px]">
          <div className="sm:hidden lg:block">
            <div className="font-display text-[20px] italic leading-[1.1] text-pink">Glam AI</div>
            <div className="mt-[3px] text-[10px] uppercase tracking-[0.12em] text-text-secondary">
              Your personal assistant
            </div>
          </div>
          <div className="hidden justify-center text-[20px] italic text-pink sm:flex lg:hidden">
            ✦
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 sm:px-1.5">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.1em] text-text-secondary sm:hidden lg:block">
                {group}
              </div>
              {routes
                .filter((route) => route.group === group)
                .map((route) => {
                  const Icon = route.icon;
                  return (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      end={route.path === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `mb-0.5 flex w-full items-center gap-[9px] rounded-md px-2.5 py-2 text-[13px] transition-colors sm:justify-center lg:justify-start ${
                          isActive
                            ? "bg-pink-light font-medium text-pink"
                            : "text-text-secondary hover:bg-surface hover:text-text-primary"
                        }`
                      }
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="sm:hidden lg:inline">{route.label}</span>
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-border px-4 py-3 sm:justify-center sm:px-2 lg:justify-start lg:px-4">
          <div
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--color-pink-mid), var(--color-coral))" }}
          >
            SC
          </div>
          <div className="sm:hidden lg:block">
            <div className="text-[12px] font-medium text-text-primary">Sofia Caruso</div>
            <div className="text-[10px] text-text-secondary">@sofiaglam · 284k</div>
          </div>
        </div>
      </aside>
    </>
  );
}
