/**
 * توقيع/تحقق الجلسة — متوافق مع Edge (middleware) وNode.
 * لا يستورد bcrypt أو وحدات Node الثقيلة.
 */

export const COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 ساعة

const DEFAULT_SECRET = "dev-only-auth-secret-change-me";

export function getAuthSecret(): string {
  const secret = (process.env.AUTH_SECRET ?? "").trim();
  if (secret.length >= 32) return secret;
  if (secret.length >= 16) return secret;
  return DEFAULT_SECRET;
}

export interface SessionPayload {
  email: string;
  exp: number;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]!);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(sig);
}

export async function createSessionToken(email: string): Promise<string> {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = await hmacSign(payloadStr, getAuthSecret());
  const payloadB64 = toBase64Url(encUtf8(payloadStr));
  return `${payloadB64}.${sig}`;
}

function encUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payloadBytes = fromBase64Url(payloadB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const expected = await hmacSign(payloadStr, getAuthSecret());
    if (expected !== sig) return null;
    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.email || typeof payload.email !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
