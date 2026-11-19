import { randomBytes } from "crypto";
import { generateSecret, generateSync, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { hashPassword, verifyPassword } from "@/lib/password";
import { decryptTotpSecret, encryptTotpSecret } from "@/lib/totp-crypto";

const ISSUER = "كتالوج الهدايا GIS";
const BACKUP_COUNT = 8;

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email.trim().toLowerCase(),
    secret,
  });
}

/** توليد QR كـ data URL على الخادم — بدون خدمات خارجية */
export async function generateTotpQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: { dark: "#0c3328", light: "#ffffff" },
  });
}

export function encryptSecret(plainSecret: string): string {
  return encryptTotpSecret(plainSecret);
}

export function decryptSecret(enc: string): string {
  return decryptTotpSecret(enc);
}

export type TotpVerifyResult =
  | { ok: true; timeStep: number }
  | { ok: false; reason: "invalid" | "replay" };

/**
 * يتحقق من رمز TOTP مع نافذة ±1 فترة (30 ثانية).
 * يرفض إعادة استخدام نفس الخطوة الزمنية.
 */
export function verifyTotpCode(
  plainSecret: string,
  token: string,
  lastUsedStep: number | null
): TotpVerifyResult {
  const code = (token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid" };

  const result = verifySync({
    secret: plainSecret,
    token: code,
    epochTolerance: 30,
  });

  if (!result.valid) {
    return { ok: false, reason: "invalid" };
  }

  // otplib يعيد delta (-1/0/1) للفترة المطابقة؛ نحسب رقم الخطوة الزمنية منه
  const delta = typeof (result as { delta?: unknown }).delta === "number"
    ? ((result as { delta: number }).delta)
    : 0;
  const timeStep = Math.floor(Date.now() / 1000 / 30) + delta;

  if (lastUsedStep != null && timeStep <= lastUsedStep) {
    return { ok: false, reason: "replay" };
  }

  return { ok: true, timeStep };
}

/** للتأكيد أثناء التفعيل فقط */
export function verifyTotpForSetup(plainSecret: string, token: string): boolean {
  const code = (token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const result = verifySync({
    secret: plainSecret,
    token: code,
    epochTolerance: 30,
  });
  return Boolean(result.valid);
}

function randomBackupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
    if (i === 3) out += "-";
  }
  return out;
}

export async function generateBackupCodes(): Promise<{
  plain: string[];
  hashes: string[];
}> {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_COUNT; i++) {
    const code = randomBackupCode();
    plain.push(code);
    hashes.push(await hashPassword(code));
  }
  return { plain, hashes };
}

export async function consumeBackupCode(
  hashes: string[],
  input: string
): Promise<{ ok: true; remainingHashes: string[] } | { ok: false }> {
  const code = (input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return { ok: false };
  for (let i = 0; i < hashes.length; i++) {
    const h = hashes[i]!;
    if (await verifyPassword(code, h)) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { ok: true, remainingHashes: remaining };
    }
  }
  return { ok: false };
}

/** للاختبارات / التشخيص فقط */
export function generateCurrentTotp(plainSecret: string): string {
  return generateSync({ secret: plainSecret });
}
