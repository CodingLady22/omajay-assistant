import express from "express";
import { closeDatabaseConnection, connectToDatabase } from "@/db/client";
import { createStandardIndexes } from "@/db/indexes";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

async function bootstrap(): Promise<void> {
  await connectToDatabase();
  await createStandardIndexes();

  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  app.listen(env.PORT, () => {
    logger.info("index", `Server listening on port ${env.PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info("index", `Received ${signal}, shutting down`);
  await closeDatabaseConnection();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error("index", "Error during shutdown", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error("index", "Error during shutdown", error);
    process.exit(1);
  });
});

bootstrap().catch((error) => {
  logger.error("index", "Failed to start server", error);
  process.exit(1);
});
