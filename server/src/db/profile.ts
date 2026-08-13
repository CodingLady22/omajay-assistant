import { collections } from "@/db/collections";
import type { Profile } from "@/types";

export async function getProfile(): Promise<Profile | null> {
  return collections.profile().findOne({});
}
