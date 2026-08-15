import { useChatPrompt } from "@/lib/useChatPrompt";
import { MOCK_EVENTS } from "@/lib/mock-events";
import { Chip } from "@/components/common/Chip";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventItem } from "@/components/calendar/EventItem";

export function CalendarPage() {
  const goToChat = useChatPrompt();
  const sortedEvents = [...MOCK_EVENTS].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return (
    <div className="flex-1 overflow-y-auto px-5.5 py-4.5">
      <CalendarGrid events={sortedEvents} />
      {sortedEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="text-[12px] text-text-secondary">No events yet.</div>
          <Chip onClick={() => goToChat("Add a new event to my calendar")}>+ Add event ↗</Chip>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {sortedEvents.map((event) => (
              <EventItem key={event.id} event={event} />
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
