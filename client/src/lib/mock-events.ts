export type EventColor = "pink" | "coral" | "success" | "info";

// Mirrors the server `events` collection schema (architecture.md: title, start,
// end, location, status) plus a client-only `color` for the dot — the real
// schema has no category/color field yet, so this is a mock-UI-only addition
// until feature 13 decides how a real read maps to a dot color.
export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  color: EventColor;
  // Carried for schema fidelity with `events.status` — not rendered yet,
  // same convention as Trend/Script's unused-but-typed fields.
  status: "confirmed" | "proposed";
};

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Lumière product shoot 📸",
    start: "2026-08-03T10:00:00",
    end: "2026-08-03T14:00:00",
    location: "Milan Studio",
    color: "pink",
    status: "confirmed",
  },
  {
    id: "evt-2",
    title: "Podcast interview — Beauty Unlocked 🎙️",
    start: "2026-08-05T16:00:00",
    end: "2026-08-05T17:00:00",
    location: "Remote",
    color: "coral",
    status: "confirmed",
  },
  {
    id: "evt-3",
    title: "Content filming day (3 Reels)",
    start: "2026-08-20T00:00:00",
    end: "2026-08-20T23:59:00",
    location: "Home studio",
    color: "success",
    status: "confirmed",
  },
  {
    id: "evt-4",
    title: "Brand call — Velour Cosmetics 💄",
    start: "2026-08-26T11:00:00",
    end: "2026-08-26T11:30:00",
    location: "Zoom",
    color: "info",
    status: "confirmed",
  },
];
