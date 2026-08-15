import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "@/lib/mock-events";

type Props = {
  events: CalendarEvent[];
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CalendarGrid({ events }: Props) {
  const today = new Date();
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const leadingBlanks = (firstWeekday + 6) % 7;

  const eventDays = new Set(
    events
      .map((event) => new Date(event.start))
      .filter((date) => date.getFullYear() === year && date.getMonth() === monthIndex)
      .map((date) => date.getDate()),
  );

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between">
        <div className="font-display text-[15px] text-text-primary">{monthLabel}</div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md border-[0.5px] border-border text-text-secondary opacity-40"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            disabled
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md border-[0.5px] border-border text-text-secondary opacity-40"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-1 text-center text-[10px] tracking-[0.05em] text-text-secondary uppercase">
            {label}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const isToday = day === today.getDate();
          const hasEvent = eventDays.has(day);
          return (
            <div
              key={day}
              className={`relative rounded-md py-1.5 text-center text-xs ${
                isToday ? "bg-pink-light font-semibold text-pink" : "text-text-primary hover:bg-surface-secondary"
              }`}
            >
              {day}
              {hasEvent && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pink" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
