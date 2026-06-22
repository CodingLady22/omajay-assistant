import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { seedProfile } from "@/db/seed";
import { logger } from "@/lib/logger";

async function main(): Promise<void> {
  await connectToDatabase();
  await seedProfile();
  await closeDatabaseConnection();
}

main().catch((error) => {
  logger.error("db/run-seed", "Seed script failed", error);
  process.exitCode = 1;
});
