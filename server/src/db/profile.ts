import { collections } from "@/db/collections";
import type { BriefingReminders, Profile } from "@/types";

export const DEFAULT_REMINDERS: BriefingReminders = {
  events: true,
  scripts: true,
  contracts: true,
  dms: true,
};

// A profile written before this field existed has no `reminders` at all —
// every category defaults to on, so a legacy profile's briefing behaves
// exactly as it always has.
export function withReminderDefaults(reminders: Partial<BriefingReminders> | undefined): BriefingReminders {
  return { ...DEFAULT_REMINDERS, ...reminders };
}

export async function getProfile(): Promise<Profile | null> {
  return collections.profile().findOne({});
}

export async function updateProfileSettings(
  briefingTime: string,
  reminders: BriefingReminders
): Promise<Profile | null> {
  const updated = await collections
    .profile()
    .findOneAndUpdate({}, { $set: { briefing_time: briefingTime, reminders, updated_at: new Date() } }, { returnDocument: "after" });
  return updated ?? null;
}
