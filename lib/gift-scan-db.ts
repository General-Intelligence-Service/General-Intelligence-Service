import { sql } from "@vercel/postgres";
import { getProductBySku } from "@/data/products";

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

  const product = getProductBySku(qrCode.trim());
  if (!product) return null;

  const sku = product.sku;
  const defaultQty = product.availableQuantity ?? 0;

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
    INSERT INTO scan_logs (qr_code, gift_name, remaining_quantity, scanned_at)
    VALUES (${qrCode}, ${product.name}, ${newQty}, NOW())
  `;

  return {
    status: "success",
    gift_name: product.name,
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
