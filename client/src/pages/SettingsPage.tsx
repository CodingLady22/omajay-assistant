import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import type { BriefingReminders, ConnectionStatus } from "@/lib/types";

type LoadState = "loading" | "error" | "ready";

const REMINDER_ROWS: { key: keyof BriefingReminders; label: string }[] = [
  { key: "events", label: "📅 Today's calendar events" },
  { key: "scripts", label: "✏️ Unfinished script drafts" },
  { key: "contracts", label: "📄 Unsent contract drafts" },
  { key: "dms", label: "💌 Brand DMs waiting on a reply" },
];

const CONNECTION_ROWS: { key: keyof ConnectionStatus; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "googleCalendar", label: "Google Calendar" },
];

const DEFAULT_REMINDERS: BriefingReminders = { events: true, scripts: true, contracts: true, dms: true };

export function SettingsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [briefingTime, setBriefingTime] = useState("08:00");
  const [reminders, setReminders] = useState<BriefingReminders>(DEFAULT_REMINDERS);
  const [connections, setConnections] = useState<ConnectionStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Fetched once on mount only — a save applies the POST response directly
  // (see handleSave) rather than triggering a second GET, so this doesn't
  // need to be a reusable, effect-triggered callback like ContractsPage's
  // refetchContracts (which multiple child cards can each trigger again).
  useEffect(() => {
    getSettings().then((result) => {
      if (result.success) {
        setBriefingTime(result.data.briefingTime);
        setReminders(result.data.reminders);
        setConnections(result.data.connections);
        setState("ready");
      } else {
        setState("error");
      }
    });
  }, []);

  function handleTimeChange(value: string) {
    setBriefingTime(value);
    setSaved(false);
  }

  function toggleReminder(key: keyof BriefingReminders) {
    setReminders((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const result = await updateSettings(briefingTime, reminders);
    setIsSaving(false);
    if (result.success) {
      setBriefingTime(result.data.briefingTime);
      setReminders(result.data.reminders);
      setConnections(result.data.connections);
      setSaved(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      {state === "loading" && (
        <div className="flex items-center justify-center py-6 text-[12px] text-text-secondary">Loading settings…</div>
      )}

      {state === "error" && (
        <div className="flex items-center justify-center py-6 text-[12px] text-text-secondary">
          Couldn't load settings right now — try again in a moment.
        </div>
      )}

      {state === "ready" && connections && (
        <>
          <div className="mb-3 rounded-lg border-[0.5px] border-border bg-surface px-4.5 py-4">
            <div className="mb-1.5 text-[13px] font-medium text-text-primary">📱 WhatsApp briefing</div>
            <div className="mb-3.5 text-xs leading-[1.6] text-text-secondary">
              Sent once a day, at the time below — the only message she gets without asking. Choose which categories it
              reminds her about.
            </div>

            <div className="flex items-center justify-between border-b-[0.5px] border-border py-2.25 text-xs">
              <span className="text-text-primary">Send time</span>
              <input
                type="time"
                value={briefingTime}
                onChange={(event) => handleTimeChange(event.target.value)}
                className="rounded-md border-[0.5px] border-border bg-surface px-3 py-2 text-[12px] text-text-primary focus:border-pink-mid focus:outline-none"
              />
            </div>

            {REMINDER_ROWS.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => toggleReminder(row.key)}
                className="flex w-full items-center justify-between border-b-[0.5px] border-border py-2.25 text-left text-xs transition-opacity last:border-b-0 hover:opacity-70"
              >
                <span className="text-text-primary">{row.label}</span>
                <span className={reminders[row.key] ? "font-medium text-success" : "text-text-secondary"}>
                  {reminders[row.key] ? "On" : "Off"}
                </span>
              </button>
            ))}

            <div className="mt-3.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={isSaving}
                className="rounded-md bg-pink px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
              {saved && <span className="text-[11px] font-medium text-success">Saved</span>}
              {error && <span className="text-[11px] text-text-secondary">{error}</span>}
            </div>
          </div>

          <div className="rounded-lg border-[0.5px] border-border bg-surface px-4.5 py-4">
            <div className="mb-1.5 text-[13px] font-medium text-text-primary">Connected accounts</div>
            <div className="mb-3.5 text-xs leading-[1.6] text-text-secondary">
              Whether each integration's credentials are set up on the server.
            </div>
            {CONNECTION_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between border-b-[0.5px] border-border py-2.25 text-xs last:border-b-0"
              >
                <span className="text-text-primary">{row.label}</span>
                <span className={connections[row.key] ? "font-medium text-success" : "text-text-secondary"}>
                  {connections[row.key] ? "Connected" : "Not connected"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
