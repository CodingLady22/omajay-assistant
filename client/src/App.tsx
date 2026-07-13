import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ChatPage } from "@/pages/ChatPage";
import { TrendsPage } from "@/pages/TrendsPage";
import { ScriptsPage } from "@/pages/ScriptsPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { DmsPage } from "@/pages/DmsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background lg:p-5">
      <div className="flex h-screen w-full overflow-hidden bg-surface lg:h-[calc(100vh-2.5rem)] lg:max-w-225 lg:rounded-lg lg:border-[0.5px] lg:border-border lg:shadow-shell">
        <Sidebar isMobileOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
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
