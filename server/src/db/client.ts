import { MongoClient, type Db } from "mongodb";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sleep } from "@/lib/utils";

const CONNECT_RETRY_ATTEMPTS = 5;
const CONNECT_RETRY_DELAY_MS = 2000;

let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  let lastError: unknown;
  for (let attempt = 1; attempt <= CONNECT_RETRY_ATTEMPTS; attempt++) {
    const newClient = new MongoClient(env.MONGODB_URI);
    try {
      await newClient.connect();
      client = newClient;
      db = newClient.db();
      logger.info("db/client", `Connected to MongoDB (attempt ${attempt}/${CONNECT_RETRY_ATTEMPTS})`);
      return db;
    } catch (error) {
      lastError = error;
      await newClient.close().catch(() => {});
      logger.warn("db/client", `MongoDB connection attempt ${attempt}/${CONNECT_RETRY_ATTEMPTS} failed`, error);
      if (attempt < CONNECT_RETRY_ATTEMPTS) {
        await sleep(CONNECT_RETRY_DELAY_MS);
      }
    }
  }

  logger.error("db/client", "Exhausted all MongoDB connection attempts", lastError);
  throw new Error("Failed to connect to MongoDB after retries");
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not connected — call connectToDatabase() before accessing the database");
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
