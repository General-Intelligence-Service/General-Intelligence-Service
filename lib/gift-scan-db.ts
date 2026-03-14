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

export interface ScanResult {
  status: "success";
  gift_name: string;
  remaining_quantity: number;
}

export async function processScan(qrCode: string): Promise<ScanResult | null> {
  await ensureGiftTables();
  await ensureProductsTable();
  await seedProductsIfEmpty();

  const resolved = await resolveProductFromQrContent(qrCode);
  if (!resolved) return null;

  const { sku, name, availableQuantity: defaultQty } = resolved;

  const { rows: invRows } = await sql`
    SELECT quantity FROM inventory WHERE sku = ${sku}
  `;
  let currentQty = invRows.length > 0 ? Number(invRows[0].quantity) : defaultQty;

  if (currentQty <= 0) {
    return null;
  }

  const newQty = currentQty - 1;

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
