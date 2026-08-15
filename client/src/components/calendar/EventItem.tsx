import type { CalendarEvent, EventColor } from "@/lib/mock-events";

type Props = {
  event: CalendarEvent;
};

const DOT_COLOR: Record<EventColor, string> = {
  pink: "bg-pink",
  coral: "bg-coral",
  success: "bg-success",
  info: "bg-info",
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatMeta(event: CalendarEvent): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const weekday = start.toLocaleDateString("en-US", { weekday: "short" });
  const day = start.getDate();
  const month = start.toLocaleDateString("en-US", { month: "short" });
  const isAllDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
  const timePart = isAllDay ? "All day" : `${formatTime(start)}–${formatTime(end)}`;
  return `${weekday} ${day} ${month} · ${timePart} · ${event.location}`;
}

export function EventItem({ event }: Props) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border-[0.5px] border-border bg-surface px-3 py-2.5">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[event.color]}`} />
      <div>
        <div className="text-[13px] font-medium text-text-primary">{event.title}</div>
        <div className="mt-0.5 text-[11px] text-text-secondary">{formatMeta(event)}</div>
      </div>
    </div>
  );
}
