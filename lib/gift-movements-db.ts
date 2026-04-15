import { sql } from "@vercel/postgres";

export type TodayGiftItem = { slug: string; outQty: number; inQty: number };

let initDone = false;

export async function ensureGiftMovementsTables(): Promise<void> {
  if (initDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS gift_movements (
      day DATE NOT NULL,
      slug VARCHAR(255) NOT NULL,
      sku VARCHAR(64),
      out_qty INTEGER NOT NULL DEFAULT 0,
      in_qty INTEGER NOT NULL DEFAULT 0,
      updated_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (day, slug)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS warehouse_entries (
      day DATE NOT NULL,
      slug VARCHAR(255) NOT NULL,
      out_qty INTEGER NOT NULL DEFAULT 0,
      in_qty INTEGER NOT NULL DEFAULT 0,
      updated_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (day, slug)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS gift_movements_day_idx ON gift_movements (day)`;
  await sql`CREATE INDEX IF NOT EXISTS gift_movements_sku_idx ON gift_movements (sku)`;
  await sql`CREATE INDEX IF NOT EXISTS warehouse_entries_day_idx ON warehouse_entries (day)`;
  initDone = true;
}

function clampQty(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? "0"), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(999999, Math.floor(v)));
}

export function normalizeTodayGiftItems(items: TodayGiftItem[]): TodayGiftItem[] {
  const out: TodayGiftItem[] = [];
  const seen = new Set<string>();
  for (const it of items ?? []) {
    const slug = String(it?.slug ?? "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      outQty: clampQty(it.outQty),
      inQty: clampQty(it.inQty),
    });
  }
  return out;
}

/**
 * حركة مستودع يومية (يدوية) بشكل idempotent:
 * - نخزن الإدخال اليومي المطلق في warehouse_entries
 * - نحسب الفرق عن آخر حفظ (delta) ونضيفه إلى gift_movements (تجميعي لكل المصادر)
 * - نطبّق أثر الفرق على المخزون (products + inventory)
 */
export async function applyWarehouseEntriesAndUpdateStock(
  dayIso: string,
  items: TodayGiftItem[],
  updatedByEmail?: string
): Promise<{ appliedCount: number }> {
  await ensureGiftMovementsTables();
  const day = dayIso.trim();
  const normalized = normalizeTodayGiftItems(items);

  // Transaction
  await sql`BEGIN`;
  try {
    let appliedCount = 0;

    for (const it of normalized) {
      // read previous warehouse entry for that day+slug
      const { rows: prevRows } = await sql`
        SELECT out_qty, in_qty
        FROM warehouse_entries
        WHERE day = ${day}::date AND slug = ${it.slug}
        LIMIT 1
      `;
      const prevOut = prevRows.length ? Number(prevRows[0].out_qty) : 0;
      const prevIn = prevRows.length ? Number(prevRows[0].in_qty) : 0;

      const deltaOut = it.outQty - (Number.isFinite(prevOut) ? prevOut : 0);
      const deltaIn = it.inQty - (Number.isFinite(prevIn) ? prevIn : 0);
      const delta = deltaIn - deltaOut;

      // Get SKU (for inventory sync)
      const { rows: skuRows } = await sql`
        SELECT sku
        FROM products
        WHERE slug = ${it.slug}
        LIMIT 1
      `;
      const sku = skuRows.length ? String(skuRows[0].sku ?? "") : null;

      await sql`
        INSERT INTO warehouse_entries (day, slug, out_qty, in_qty, updated_by, updated_at)
        VALUES (${day}::date, ${it.slug}, ${it.outQty}, ${it.inQty}, ${updatedByEmail ?? null}, NOW())
        ON CONFLICT (day, slug) DO UPDATE
          SET out_qty = EXCLUDED.out_qty,
              in_qty = EXCLUDED.in_qty,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
      `;

      // If no delta, skip stock update.
      if (delta === 0) continue;

      // Add deltas to aggregated daily movement totals
      await sql`
        INSERT INTO gift_movements (day, slug, sku, out_qty, in_qty, updated_by, updated_at)
        VALUES (${day}::date, ${it.slug}, ${sku}, ${Math.max(0, deltaOut)}, ${Math.max(0, deltaIn)}, ${updatedByEmail ?? null}, NOW())
        ON CONFLICT (day, slug) DO UPDATE
          SET out_qty = GREATEST(0, gift_movements.out_qty + ${deltaOut}),
              in_qty = GREATEST(0, gift_movements.in_qty + ${deltaIn}),
              sku = COALESCE(EXCLUDED.sku, gift_movements.sku),
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
      `;

      // Apply stock update (non-negative)
      const { rowCount } = await sql`
        UPDATE products
        SET available_quantity = GREATEST(0, available_quantity + ${delta}),
            updated_at = NOW()
        WHERE slug = ${it.slug}
      `;
      if ((rowCount ?? 0) > 0) appliedCount++;

      // Keep inventory table in sync (used by gift scanner)
      if (sku) {
        const { rows: invRows } = await sql`
          SELECT quantity FROM inventory WHERE sku = ${sku} LIMIT 1
        `;
        if (invRows.length > 0) {
          await sql`
            UPDATE inventory
            SET quantity = GREATEST(0, quantity + ${delta}),
                updated_at = NOW()
            WHERE sku = ${sku}
          `;
        } else {
          // Seed inventory from products current quantity
          const { rows: pRows } = await sql`
            SELECT available_quantity FROM products WHERE slug = ${it.slug} LIMIT 1
          `;
          const qty = pRows.length ? Number(pRows[0].available_quantity ?? 0) : 0;
          await sql`
            INSERT INTO inventory (sku, quantity, updated_at)
            VALUES (${sku}, ${Math.max(0, qty)}, NOW())
          `;
        }
      }
    }

    await sql`COMMIT`;
    return { appliedCount };
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

export async function getMonthlyMovementSummary(month: string): Promise<
  { slug: string; sku: string | null; outQty: number; inQty: number; net: number }[]
> {
  await ensureGiftMovementsTables();
  const m = month.trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return [];
  const start = `${m}-01`;
  const { rows } = await sql`
    SELECT
      slug,
      MAX(sku) as sku,
      SUM(out_qty)::int as out_qty,
      SUM(in_qty)::int as in_qty
    FROM gift_movements
    WHERE day >= ${start}::date
      AND day < (${start}::date + INTERVAL '1 month')
    GROUP BY slug
    ORDER BY slug ASC
  `;
  return rows.map((r) => {
    const outQty = Number((r as any).out_qty ?? 0);
    const inQty = Number((r as any).in_qty ?? 0);
    return {
      slug: String((r as any).slug),
      sku: (r as any).sku != null ? String((r as any).sku) : null,
      outQty: Number.isFinite(outQty) ? outQty : 0,
      inQty: Number.isFinite(inQty) ? inQty : 0,
      net: (Number.isFinite(inQty) ? inQty : 0) - (Number.isFinite(outQty) ? outQty : 0),
    };
  });
}

