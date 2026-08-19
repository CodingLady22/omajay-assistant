import { useState } from "react";
import { Chip } from "@/components/common/Chip";
import { confirmCalendarEvent, discardCalendarEvent } from "@/lib/api";
import type { CalendarEvent, EventColor } from "@/lib/types";

type Props = {
  event: CalendarEvent;
  onChange?: () => void;
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

export function EventItem({ event, onChange }: Props) {
  const isProposed = event.status === "proposed";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    const result = await confirmCalendarEvent(event.id);
    if (result.success) {
      onChange?.();
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  async function handleDiscard() {
    setIsSubmitting(true);
    setError(null);
    const result = await discardCalendarEvent(event.id);
    if (result.success) {
      onChange?.();
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-start gap-2.5 rounded-md border-[0.5px] border-border bg-surface px-3 py-2.5">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[event.color]}`} />
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <div className="text-[13px] font-medium text-text-primary">{event.title}</div>
          {isProposed && (
            <span className="rounded-full bg-info-bg px-1.75 py-0.5 text-[10px] font-normal text-info">Pending</span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-text-secondary">{formatMeta(event)}</div>
        {isProposed && (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="rounded-md bg-pink px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm
              </button>
              <Chip onClick={handleDiscard} disabled={isSubmitting}>
                Discard
              </Chip>
            </div>
            {/* No dedicated error/danger token exists yet (ui-tokens.md's
                palette is closed) — matches the plain-secondary-text error
                convention every other panel already uses ahead of feature 23's
                unified error-styling pass. */}
            {error && <div className="text-[11px] text-text-secondary">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
