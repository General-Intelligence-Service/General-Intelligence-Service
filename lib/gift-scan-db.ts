import { sql } from "@vercel/postgres";
import {
  ensureProductsTable,
  seedProductsIfEmpty,
  getProductBySku,
  getProductBySlug,
} from "@/lib/products-db";

async function resolveProductFromQrContent(
  qrCode: string
): Promise<{ sku: string; name: string; availableQuantity: number } | null> {
  const trimmed = qrCode.trim();
  let product = await getProductBySku(trimmed);
  if (product) {
    return { sku: product.sku, name: product.name, availableQuantity: product.availableQuantity ?? 0 };
  }
  const slugMatch = trimmed.match(/\/products\/([^/?\s]+)/);
  if (slugMatch) {
    product = await getProductBySlug(slugMatch[1]);
    if (product) {
      return { sku: product.sku, name: product.name, availableQuantity: product.availableQuantity ?? 0 };
    }
  }
  return null;
}

let initDone = false;

export async function ensureGiftTables(): Promise<void> {
  if (initDone) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        sku VARCHAR(64) PRIMARY KEY,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id SERIAL PRIMARY KEY,
        qr_code VARCHAR(255) NOT NULL,
        gift_name VARCHAR(512) NOT NULL,
        remaining_quantity INTEGER NOT NULL,
        scanned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    initDone = true;
  } catch (e) {
    console.error("gift-scan-db init:", e);
    throw e;
  }
}

export interface ResolveResult {
  sku: string;
  gift_name: string;
  current_quantity: number;
}

/** استعلام فقط عن المنتج والكمية الحالية دون تعديل */
export async function resolveGift(qrCode: string): Promise<ResolveResult | null> {
  await ensureGiftTables();
  await ensureProductsTable();
  await seedProductsIfEmpty();

  const resolved = await resolveProductFromQrContent(qrCode);
  if (!resolved) return null;

  const { sku, name, availableQuantity: defaultQty } = resolved;

  const { rows: invRows } = await sql`
    SELECT quantity FROM inventory WHERE sku = ${sku}
  `;
  const currentQty = invRows.length > 0 ? Number(invRows[0].quantity) : defaultQty;

  return {
    sku,
    gift_name: name,
    current_quantity: Math.max(0, currentQty),
  };
}

export interface ScanResult {
  status: "success";
  gift_name: string;
  remaining_quantity: number;
}

export interface ProcessScanOptions {
  action: "deduct" | "add";
  quantity: number;
}

export async function processScan(
  qrCode: string,
  options: ProcessScanOptions = { action: "deduct", quantity: 1 }
): Promise<ScanResult | null> {
  await ensureGiftTables();
  await ensureProductsTable();
  await seedProductsIfEmpty();

  const resolved = await resolveProductFromQrContent(qrCode);
  if (!resolved) return null;

  const { sku, name, availableQuantity: defaultQty } = resolved;
  const { action, quantity } = options;
  const qty = Math.max(1, Math.floor(quantity));

  const { rows: invRows } = await sql`
    SELECT quantity FROM inventory WHERE sku = ${sku}
  `;
  let currentQty = invRows.length > 0 ? Number(invRows[0].quantity) : defaultQty;

  let newQty: number;
  if (action === "deduct") {
    if (currentQty < qty) return null;
    newQty = currentQty - qty;
  } else {
    newQty = currentQty + qty;
  }

  if (invRows.length > 0) {
    await sql`UPDATE inventory SET quantity = ${newQty}, updated_at = NOW() WHERE sku = ${sku}`;
  } else {
    await sql`INSERT INTO inventory (sku, quantity, updated_at) VALUES (${sku}, ${newQty}, NOW())`;
  }

  await sql`
    UPDATE products SET available_quantity = ${newQty}, updated_at = NOW() WHERE sku = ${sku}
  `;

  await sql`
    INSERT INTO scan_logs (qr_code, gift_name, remaining_quantity, scanned_at)
    VALUES (${qrCode}, ${name}, ${newQty}, NOW())
  `;

  return {
    status: "success",
    gift_name: name,
    remaining_quantity: newQty,
  };
}

export function isPostgresConfigured(): boolean {
  try {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    return Boolean(url && url.length > 0);
  } catch {
    return false;
  }
}
