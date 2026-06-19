import "dotenv/config";
import { z } from "zod";
import { logger } from "@/lib/logger";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  // ANTHROPIC_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  INSTAGRAM_TOKEN: z.string().min(1),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  YOUTUBE_API_KEY: z.string().min(1),
  GOOGLE_CALENDAR_CREDENTIALS: z.string().min(1),
  EMBEDDING_API_KEY: z.string().min(1),
});

function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    logger.error("lib/env", `Missing or invalid environment variables: ${missing}`);
    throw new Error(`Invalid environment configuration: ${missing}`);
  }
  return result.data;
}

export const env = loadEnv();
