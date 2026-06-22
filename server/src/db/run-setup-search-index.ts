import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { createVectorSearchIndex } from "@/db/indexes";
import { logger } from "@/lib/logger";

async function main(): Promise<void> {
  await connectToDatabase();
  await createVectorSearchIndex();
  await closeDatabaseConnection();
}

main().catch((error) => {
  logger.error("db/run-setup-search-index", "Vector search index setup failed", error);
  process.exitCode = 1;
});
