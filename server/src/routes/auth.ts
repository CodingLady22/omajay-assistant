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
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const attemptsByIp = new Map<string, { count: number; windowStart: number }>();

// isThrottled()/registerFailedAttempt() only ever touch the entry for the IP
// making the current request — an IP that fails a few times (never enough to
// throttle) and never comes back leaves its entry behind forever. This sweep
// is the only thing that ever cleans up that case; without it, a long-lived
// process fielding scattered failed attempts from many source IPs (bots,
// scanners) would grow this Map without bound.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsByIp) {
    if (now - record.windowStart > THROTTLE_WINDOW_MS) attemptsByIp.delete(ip);
  }
}, SWEEP_INTERVAL_MS).unref();

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
  try {
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return res.json({ success: true, data: { authenticated: false } });
  } catch (error) {
    logger.error("routes/auth", "Logout failed", error);
    return res.status(500).json({ success: false, error: "Couldn't log out right now — try again in a moment." });
  }
});

// Never gated by requireAuth — this is how the client discovers auth state
// before it knows it, so it always returns 200 (a caught error still
// reports authenticated: false rather than crashing the client's own
// bootstrap check).
router.get("/status", (req: Request, res: Response) => {
  try {
    const authenticated = verifySessionToken(getSessionTokenFromRequest(req));
    return res.json({ success: true, data: { authenticated } });
  } catch (error) {
    logger.error("routes/auth", "Auth status check failed", error);
    return res.json({ success: true, data: { authenticated: false } });
  }
});

export default router;
