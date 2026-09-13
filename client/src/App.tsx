import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getAuthStatus, logout } from "@/lib/api";
import { ChatPage } from "@/pages/ChatPage";
import { LoginPage } from "@/pages/LoginPage";
import { TrendsPage } from "@/pages/TrendsPage";
import { ScriptsPage } from "@/pages/ScriptsPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { DmsPage } from "@/pages/DmsPage";
import { SettingsPage } from "@/pages/SettingsPage";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export function App() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    getAuthStatus().then((result) => {
      setAuthState(result.success && result.data.authenticated ? "authenticated" : "unauthenticated");
    });
  }, []);

  async function handleLogout() {
    await logout();
    setAuthState("unauthenticated");
  }

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-[12px] text-text-secondary">
        Loading…
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginPage onSuccess={() => setAuthState("authenticated")} />;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background lg:p-5">
      <div className="flex h-screen w-full overflow-hidden bg-surface lg:h-[calc(100vh-2.5rem)] lg:max-w-225 lg:rounded-lg lg:border-[0.5px] lg:border-border lg:shadow-shell">
        <Sidebar
          isMobileOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          onLogout={() => {
            void handleLogout();
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setIsMobileNavOpen(true)} />
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/scripts" element={<ScriptsPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/dms" element={<DmsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
