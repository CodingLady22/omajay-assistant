import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  createSessionToken,
  getSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifyPassword,
  verifySessionToken,
} from "@/lib/session";

const router = Router();

const loginBodySchema = z.object({ password: z.string().min(1) });

// Simple in-memory per-IP throttle — no persistence, resets on restart and
// on a successful login. Proportionate for a single-user app with a strong
// random DASHBOARD_PASSWORD; module-scoped here rather than its own file
// since it's small and has exactly one consumer (same precedent as
// jobs/scheduler.ts holding the live cron task at module scope).
const MAX_ATTEMPTS = 5;
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const attemptsByIp = new Map<string, { count: number; windowStart: number }>();

function isThrottled(ip: string): boolean {
  const record = attemptsByIp.get(ip);
  if (!record) return false;
  if (Date.now() - record.windowStart > THROTTLE_WINDOW_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(ip: string): void {
  const record = attemptsByIp.get(ip);
  if (!record || Date.now() - record.windowStart > THROTTLE_WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, windowStart: Date.now() });
    return;
  }
  record.count += 1;
}

router.post("/login", (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? "unknown";
    if (isThrottled(ip)) {
      return res.status(429).json({ success: false, error: "Too many attempts — try again in a few minutes." });
    }

    const { password } = loginBodySchema.parse(req.body);
    if (!verifyPassword(password)) {
      registerFailedAttempt(ip);
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    attemptsByIp.delete(ip);
    res.cookie(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
    return res.json({ success: true, data: { authenticated: true } });
  } catch (error) {
    logger.error("routes/auth", "Login failed", error);
    return res.status(500).json({ success: false, error: "Couldn't log in right now — try again in a moment." });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  return res.json({ success: true, data: { authenticated: false } });
});

// Never gated by requireAuth — this is how the client discovers auth state
// before it knows it, so it always returns 200.
router.get("/status", (req: Request, res: Response) => {
  const authenticated = verifySessionToken(getSessionTokenFromRequest(req));
  return res.json({ success: true, data: { authenticated } });
});

export default router;
