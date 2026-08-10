import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { runDailyTrendsScan } from "@/jobs/daily-trends";
import { logger } from "@/lib/logger";

async function main(): Promise<void> {
  await connectToDatabase();
  await runDailyTrendsScan();
}

main()
  .catch((error) => {
    logger.error("jobs/run-daily-trends-test", "Daily trends job test run failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabaseConnection());
