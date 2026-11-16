import { cookies } from "next/headers";
import { verifyPassword } from "@/lib/password";
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken as createToken,
  verifySessionToken as verifyToken,
  type SessionPayload,
} from "@/lib/auth-token";

export {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  type SessionPayload,
};

export async function createSessionToken(email: string): Promise<string> {
  return createToken(email);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  return verifyToken(token);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}

export function getAllowedEmails(): string[] {
  const env = process.env.ALLOWED_ADMIN_EMAILS ?? "";
  return env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string): boolean {
  const list = getAllowedEmails();
  return list.length > 0 && list.includes(email.trim().toLowerCase());
}

function parseAdminCredentials(): Record<string, string> {
  const raw = (process.env.ADMIN_CREDENTIALS ?? "").trim();
  const out: Record<string, string> = {};
  if (!raw) return out;
  const pairs = raw
    .split(/[,;\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of pairs) {
    const idx = p.indexOf(":");
    if (idx <= 0) continue;
    const email = p.slice(0, idx).trim().toLowerCase();
    const pass = p.slice(idx + 1).trim();
    if (email && pass) out[email] = pass;
  }
  return out;
}

export async function checkAdminPassword(email: string, password: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const pass = (password ?? "").trim();
  if (!pass) return false;

  const map = parseAdminCredentials();
  if (map[e] !== undefined) {
    return verifyPassword(pass, map[e]);
  }

  const hash = (process.env.ADMIN_PASSWORD_HASH ?? "").trim();
  if (hash) {
    return verifyPassword(pass, hash);
  }

  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  return verifyPassword(pass, expected);
}
