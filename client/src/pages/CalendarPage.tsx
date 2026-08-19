import { useEffect, useState } from "react";
import { getCalendarEvents } from "@/lib/api";
import { useChatPrompt } from "@/lib/useChatPrompt";
import type { CalendarEvent } from "@/lib/types";
import { Chip } from "@/components/common/Chip";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventItem } from "@/components/calendar/EventItem";

type LoadState = "loading" | "error" | "ready";

export function CalendarPage() {
  const goToChat = useChatPrompt();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    getCalendarEvents().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setEvents(result.data);
        setState("ready");
      } else {
        setState("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refetch(): Promise<void> {
    const result = await getCalendarEvents();
    if (result.success) {
      setEvents(result.data);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Loading calendar…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-1 items-center justify-center px-5.5 py-4.5 text-[12px] text-text-secondary">
        Couldn't load your calendar right now — try again in a moment.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <CalendarGrid events={events} />
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="text-[12px] text-text-secondary">No events yet.</div>
          <Chip onClick={() => goToChat("Add a new event to my calendar")}>+ Add event ↗</Chip>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <EventItem key={event.id} event={event} onChange={refetch} />
            ))}
          </div>
          <Chip className="mt-3" onClick={() => goToChat("Add a new event to my calendar")}>
            + Add event ↗
          </Chip>
        </>
      )}
    </div>
  );
}
