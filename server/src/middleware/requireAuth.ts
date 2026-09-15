import type { NextFunction, Request, Response } from "express";
import { getSessionTokenFromRequest, verifySessionToken } from "@/lib/session";

// Mounted on /api in index.ts, after /api/auth (and /api/whatsapp, once
// feature 05 lands — it keeps its own Meta signature check and must stay
// exempt too). Every other /api/* route requires a valid session cookie.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getSessionTokenFromRequest(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }
  next();
}
