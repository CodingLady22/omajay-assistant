import { collections } from "@/db/collections";
import { logger } from "@/lib/logger";

export async function seedProfile(): Promise<void> {
  const existing = await collections.profile().findOne({});
  if (existing) {
    logger.info("db/seed", "Profile already seeded — skipping");
    return;
  }

  await collections.profile().insertOne({
    name: "Sofia Caruso",
    handle: "@sofiaglam",
    whatsapp_number: "+10000000000",
    niche: "makeup / beauty",
    style_notes: "Warm, playful, detail-oriented — favors glowy, editorial makeup looks.",
    briefing_time: "08:00",
    timezone: "Europe/Rome",
    created_at: new Date(),
    updated_at: new Date(),
  });

  logger.info("db/seed", "Seeded profile document for Sofia Caruso");
}
