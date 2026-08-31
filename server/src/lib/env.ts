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

// Non-throwing presence check — reuses the same schema a lazyEnv getter
// would parse, but never logs or throws. For a settings "connected/not"
// badge, not a real credential validation; the getter above is still what
// every actual integration call uses.
function isConfigured<T>(schema: z.ZodType<T>): () => boolean {
  return () => schema.safeParse(process.env).success;
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

// Named separately (not inlined into lazyEnv() below) so the settings
// connected-accounts check can reuse the exact same schema via isConfigured()
// rather than keeping a second, driftable list of the same env var names.
const whatsappEnvSchema = z.object({
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
});
export const getWhatsAppEnv = lazyEnv("lib/env:whatsapp", whatsappEnvSchema);
export const isWhatsAppConfigured = isConfigured(whatsappEnvSchema);

const instagramEnvSchema = z.object({
  INSTAGRAM_TOKEN: z.string().min(1),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1),
});
export const getInstagramEnv = lazyEnv("lib/env:instagram", instagramEnvSchema);
export const isInstagramConfigured = isConfigured(instagramEnvSchema);

const youtubeEnvSchema = z.object({
  YOUTUBE_API_KEY: z.string().min(1),
});
export const getYouTubeEnv = lazyEnv("lib/env:youtube", youtubeEnvSchema);
export const isYouTubeConfigured = isConfigured(youtubeEnvSchema);

const googleCalendarEnvSchema = z.object({
  // A service-account JSON key, either inline (a JSON string starting with
  // "{") or a file path to it — see services/google-calendar.ts's loader.
  GOOGLE_CALENDAR_CREDENTIALS: z.string().min(1),
  GOOGLE_CALENDAR_ID: z.string().min(1),
});
export const getGoogleCalendarEnv = lazyEnv("lib/env:google-calendar", googleCalendarEnvSchema);
export const isGoogleCalendarConfigured = isConfigured(googleCalendarEnvSchema);

export const getEmbeddingEnv = lazyEnv(
  "lib/env:embeddings",
  z.object({
    EMBEDDING_API_KEY: z.string().min(1),
  })
);
