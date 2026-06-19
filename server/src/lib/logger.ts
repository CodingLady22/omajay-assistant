import { nowISO } from "@/lib/utils";

type Level = "info" | "warn" | "error";

function format(level: Level, context: string, message: string, meta?: unknown): string {
  const base = `[${nowISO()}] ${level.toUpperCase()} ${context} ${message}`;
  return meta === undefined ? base : `${base} ${JSON.stringify(meta)}`;
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
