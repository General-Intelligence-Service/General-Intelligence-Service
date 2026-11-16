import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;

export function looksLikeBcryptHash(value: string): boolean {
  return BCRYPT_RE.test((value ?? "").trim());
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * مقارنة آمنة: إن كانت القيمة المخزّنة bcrypt → bcrypt.compare.
 * إن كانت نصاً قديماً (انتقال مؤقت) → مقارنة ثابتة الزمن، مع تفضيل الترقية إلى هاش.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const p = (plain ?? "").trim();
  const s = (stored ?? "").trim();
  if (!p || !s) return false;

  if (looksLikeBcryptHash(s)) {
    try {
      return await bcrypt.compare(p, s);
    } catch {
      return false;
    }
  }

  // توافق مؤقت مع قيم بيئة قديمة غير مُهاشَة — يُفضّل استبدالها بـ bcrypt فوراً
  const a = Buffer.from(p);
  const b = Buffer.from(s);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a); // استهلاك زمن ثابت تقريباً
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
