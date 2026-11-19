/**
 * رمز مؤقت لخطوة 2FA بعد نجاح كلمة المرور.
 * موقّع بـ HMAC مثل الجلسة، صالح 5 دقائق، كوكي HttpOnly منفصل.
 */

import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/auth-token";

export const PENDING_2FA_COOKIE = "admin_2fa_pending";
export const PENDING_2FA_MAX_AGE = 5 * 60; // 5 دقائق
export const PENDING_2FA_MAX_ATTEMPTS = 5;

export type Pending2faPayload = {
  email: string;
  exp: number;
  /** محاولات فاشلة متراكمة داخل الرمز الموقّع */
  attempts: number;
  /** معرّف عشوائي لتقليل إعادة الاستخدام */
  jti: string;
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function encUtf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
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

function randomJti(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createPending2faToken(
  email: string,
  attempts = 0
): Promise<string> {
  const payload: Pending2faPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + PENDING_2FA_MAX_AGE,
    attempts,
    jti: randomJti(),
  };
  const payloadStr = JSON.stringify(payload);
  const sig = await hmacSign(payloadStr, getAuthSecret());
  return `${toBase64Url(encUtf8(payloadStr))}.${sig}`;
}

export async function verifyPending2faToken(
  token: string
): Promise<Pending2faPayload | null> {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payloadStr = new TextDecoder().decode(fromBase64Url(payloadB64));
    const expected = await hmacSign(payloadStr, getAuthSecret());
    if (expected !== sig) return null;
    const payload = JSON.parse(payloadStr) as Pending2faPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.email || typeof payload.email !== "string") return null;
    if (typeof payload.attempts !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setPending2faCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_2FA_MAX_AGE,
    path: "/",
  });
}

export async function deletePending2faCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}

export async function getPending2faFromCookies(): Promise<Pending2faPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  return verifyPending2faToken(token);
}

/**
 * يعيد إصدار الرمز مع زيادة المحاولات.
 * عند تجاوز الحد يُحذف الكوكي ويُعاد null.
 */
export async function bumpPending2faAttempts(
  current: Pending2faPayload
): Promise<{ exhausted: true } | { exhausted: false; attempts: number }> {
  const nextAttempts = current.attempts + 1;
  if (nextAttempts >= PENDING_2FA_MAX_ATTEMPTS) {
    await deletePending2faCookie();
    return { exhausted: true };
  }
  const token = await createPending2faToken(current.email, nextAttempts);
  await setPending2faCookie(token);
  return { exhausted: false, attempts: nextAttempts };
}
