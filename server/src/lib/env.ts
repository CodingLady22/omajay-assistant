import "dotenv/config";
import { z } from "zod";
import { logger } from "@/lib/logger";

function parseEnv<T>(context: string, schema: z.ZodType<T>): T {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    logger.error(context, `Missing or invalid environment variables: ${missing}`);
    throw new Error(`Invalid environment configuration (${context}): ${missing}`);
  }
  return result.data;
}

function lazyEnv<T>(context: string, schema: z.ZodType<T>): () => T {
  let cached: T | undefined;
  return () => {
    cached ??= parseEnv(context, schema);
    return cached;
  };
}

// Core — every feature depends on these; the server refuses to boot without them.
const coreEnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().min(1),
});

export const env = parseEnv("lib/env", coreEnvSchema);

// Per-service / per-integration — validated lazily, the first time the code
// that needs it actually runs. A feature shouldn't be blocked by credentials
// for a different feature that hasn't been built yet.
export const getLlmEnv = lazyEnv(
  "lib/env:llm",
  z.object({
    GEMINI_API_KEY: z.string().min(1),
  })
);

export const getWhatsAppEnv = lazyEnv(
  "lib/env:whatsapp",
  z.object({
    WHATSAPP_TOKEN: z.string().min(1),
    WHATSAPP_PHONE_ID: z.string().min(1),
    WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  })
);

export const getInstagramEnv = lazyEnv(
  "lib/env:instagram",
  z.object({
    INSTAGRAM_TOKEN: z.string().min(1),
    INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  })
);

export const getYouTubeEnv = lazyEnv(
  "lib/env:youtube",
  z.object({
    YOUTUBE_API_KEY: z.string().min(1),
  })
);

export const getGoogleCalendarEnv = lazyEnv(
  "lib/env:google-calendar",
  z.object({
    GOOGLE_CALENDAR_CREDENTIALS: z.string().min(1),
  })
);

export const getEmbeddingEnv = lazyEnv(
  "lib/env:embeddings",
  z.object({
    EMBEDDING_API_KEY: z.string().min(1),
  })
);
