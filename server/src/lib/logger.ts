import { nowISO } from "@/lib/utils";

type Level = "info" | "warn" | "error";

// Error's own properties (message, stack) are non-enumerable, so
// JSON.stringify(someError) silently produces "{}" — pull them out
// explicitly rather than logging an error with no visible detail.
function serializeMeta(meta: unknown): string {
  if (meta instanceof Error) {
    return JSON.stringify({ name: meta.name, message: meta.message, stack: meta.stack });
  }
  return JSON.stringify(meta);
}

function format(level: Level, context: string, message: string, meta?: unknown): string {
  const base = `[${nowISO()}] ${level.toUpperCase()} ${context} ${message}`;
  return meta === undefined ? base : `${base} ${serializeMeta(meta)}`;
}

export const logger = {
  info(context: string, message: string, meta?: unknown): void {
    console.log(format("info", context, message, meta));
  },
  warn(context: string, message: string, meta?: unknown): void {
    console.warn(format("warn", context, message, meta));
  },
  error(context: string, message: string, meta?: unknown): void {
    console.error(format("error", context, message, meta));
  },
};
