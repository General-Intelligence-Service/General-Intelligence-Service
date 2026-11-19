import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getEncryptionKey(): Buffer {
  const raw = (process.env.TOTP_ENCRYPTION_KEY ?? "").trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOTP_ENCRYPTION_KEY is required in production");
    }
    // مفتاح تطوير ثابت 32 بايت — لا يُستخدم في الإنتاج
    return Buffer.from("dev-only-totp-key-32-bytes!!!!!", "utf8").subarray(0, 32);
  }
  const fromB64 = Buffer.from(raw, "base64");
  if (fromB64.length === 32) return fromB64;
  const fromUtf = Buffer.from(raw, "utf8");
  if (fromUtf.length >= 32) return fromUtf.subarray(0, 32);
  throw new Error("TOTP_ENCRYPTION_KEY must be 32 bytes (use: openssl rand -base64 32)");
}

/** يشفر نص السر بصيغة base64(iv|tag|ciphertext) */
export function encryptTotpSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptTotpSecret(payload: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid encrypted TOTP payload");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isTotpEncryptionConfigured(): boolean {
  const raw = (process.env.TOTP_ENCRYPTION_KEY ?? "").trim();
  if (!raw) return process.env.NODE_ENV !== "production";
  try {
    const fromB64 = Buffer.from(raw, "base64");
    if (fromB64.length === 32) return true;
    return Buffer.from(raw, "utf8").length >= 32;
  } catch {
    return false;
  }
}
