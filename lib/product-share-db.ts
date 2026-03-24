import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { isProductsDbConfigured } from "@/lib/products-db";

let shareTableReady = false;

export async function ensureProductShareTable(): Promise<void> {
  if (shareTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS product_share_links (
      token VARCHAR(128) PRIMARY KEY,
      product_slug VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_share_links_expires ON product_share_links (expires_at)`;
  shareTableReady = true;
}

export function isProductShareConfigured(): boolean {
  return isProductsDbConfigured();
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export type CreateShareResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string };

/** إنشاء رابط لمرة واحدة (بعد التحقق من وجود المنتج) */
export async function createOneTimeShareLink(
  productSlug: string,
  expiresInHours: number
): Promise<CreateShareResult> {
  if (!isProductsDbConfigured()) {
    return { ok: false, error: "قاعدة البيانات غير مُعدّة" };
  }
  await ensureProductShareTable();
  const slug = productSlug.trim();
  const { rows } = await sql`SELECT 1 FROM products WHERE slug = ${slug} LIMIT 1`;
  if (rows.length === 0) {
    return { ok: false, error: "الهدية غير موجودة" };
  }
  const hours = Math.min(Math.max(1, Math.floor(expiresInHours || 72)), 720);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const token = randomToken();
  await sql`
    INSERT INTO product_share_links (token, product_slug, expires_at)
    VALUES (${token}, ${slug}, ${expiresAt.toISOString()})
  `;
  return { ok: true, token, expiresAt: expiresAt.toISOString() };
}

export type ConsumeShareResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "not_found" | "used" | "expired" | "no_db" };

/** استهلاك الرمز ذرياً: أول طلب ناجح يضع used_at */
export async function consumeOneTimeShareToken(tokenRaw: string): Promise<ConsumeShareResult> {
  if (!isProductsDbConfigured()) {
    return { ok: false, reason: "no_db" };
  }
  const token = (tokenRaw || "").trim();
  if (!token || token.length > 200) {
    return { ok: false, reason: "not_found" };
  }
  await ensureProductShareTable();
  const { rows } = await sql`
    UPDATE product_share_links
    SET used_at = NOW()
    WHERE token = ${token}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING product_slug
  `;
  if (rows.length === 0) {
    const { rows: check } = await sql`
      SELECT used_at, expires_at FROM product_share_links WHERE token = ${token} LIMIT 1
    `;
    if (check.length === 0) return { ok: false, reason: "not_found" };
    const row = check[0] as { used_at: unknown; expires_at: unknown };
    if (row.used_at) return { ok: false, reason: "used" };
    return { ok: false, reason: "expired" };
  }
  const slug = String((rows[0] as { product_slug: string }).product_slug);
  return { ok: true, slug };
}
