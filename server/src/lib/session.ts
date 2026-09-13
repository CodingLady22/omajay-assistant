import crypto from "node:crypto";
import type { Request } from "express";
import { env, isProduction } from "@/lib/env";

export const SESSION_COOKIE_NAME = "glamai_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, per developer decision

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
}

// Digests the two candidates through HMAC before comparing, rather than
// timingSafeEqual-ing the raw values directly — timingSafeEqual throws on
// unequal-length buffers, which a raw password (variable length) can't
// guarantee, and HMAC-ing first also removes any length-based timing signal.
function safeEqual(a: string, b: string): boolean {
  const digestA = crypto.createHmac("sha256", env.SESSION_SECRET).update(a).digest();
  const digestB = crypto.createHmac("sha256", env.SESSION_SECRET).update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function verifyPassword(candidate: string): boolean {
  return safeEqual(candidate, env.DASHBOARD_PASSWORD);
}

export function createSessionToken(): string {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;
  // signature is attacker-controlled (cookie value) and may be any length —
  // safeEqual (not a raw timingSafeEqual) is what lets this not throw.
  if (!safeEqual(signature, sign(encodedPayload))) return false;

  try {
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null || !("exp" in payload)) return false;
    const { exp } = payload as { exp: unknown };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// No cookie-parser dependency — Express's own res.cookie()/clearCookie()
// cover writing, and reading a single cookie out of the raw header is a
// few lines, not worth a new package for.
export function getSessionTokenFromRequest(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return undefined;
}

export function sessionCookieOptions(): { httpOnly: true; sameSite: "lax"; secure: boolean; maxAge: number; path: string } {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}
