import { sql } from "@vercel/postgres";

const TODAY_GIFTS_TABLE = "today_gifts";

let initDone = false;

export type TodayGiftItem = {
  slug: string;
  outQty: number;
  inQty: number;
};

export function isTodayGiftsDbConfigured(): boolean {
  try {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    return Boolean(url && url.length > 0);
  } catch {
    return false;
  }
}

export async function ensureTodayGiftsTable(): Promise<void> {
  if (initDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS today_gifts (
      day DATE PRIMARY KEY,
      slugs JSONB NOT NULL DEFAULT '[]',
      items JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Backfill/migration safety (older deployments)
  try {
    await sql`ALTER TABLE today_gifts ADD COLUMN items JSONB NOT NULL DEFAULT '[]'`;
  } catch {
    /* column exists */
  }
  initDone = true;
}

export async function getTodayGiftSlugs(dayIso: string): Promise<string[]> {
  await ensureTodayGiftsTable();
  const day = dayIso.trim();
  const { rows } = await sql`
    SELECT slugs
    FROM today_gifts
    WHERE day = ${day}::date
    LIMIT 1
  `;
  const slugs = rows[0]?.slugs;
  if (!Array.isArray(slugs)) return [];
  return slugs.map(String).filter(Boolean);
}

function clampQty(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? "0"), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(999999, Math.floor(v)));
}

function normalizeItems(items: TodayGiftItem[]): TodayGiftItem[] {
  const out: TodayGiftItem[] = [];
  const seen = new Set<string>();
  for (const it of items ?? []) {
    const slug = String(it?.slug ?? "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, outQty: clampQty(it.outQty), inQty: clampQty(it.inQty) });
  }
  return out;
}

export async function getTodayGiftItems(dayIso: string): Promise<TodayGiftItem[]> {
  await ensureTodayGiftsTable();
  const day = dayIso.trim();
  const { rows } = await sql`
    SELECT items, slugs
    FROM today_gifts
    WHERE day = ${day}::date
    LIMIT 1
  `;
  const row = rows[0] as { items?: unknown; slugs?: unknown } | undefined;
  if (!row) return [];
  if (Array.isArray(row.items) && row.items.length > 0) {
    // items expected to be array of objects
    const items = row.items as unknown[];
    const parsed: TodayGiftItem[] = items
      .map((x) => x as Partial<TodayGiftItem>)
      .map((x) => ({
        slug: String(x.slug ?? "").trim(),
        outQty: clampQty(x.outQty),
        inQty: clampQty(x.inQty),
      }));
    return normalizeItems(parsed);
  }
  // fallback: older rows using slugs only
  if (Array.isArray(row.slugs)) {
    return normalizeItems(row.slugs.map((s) => ({ slug: String(s), outQty: 0, inQty: 0 })));
  }
  return [];
}

export async function setTodayGiftSlugs(dayIso: string, slugs: string[]): Promise<void> {
  await ensureTodayGiftsTable();
  const day = dayIso.trim();
  const clean = Array.from(
    new Set((slugs ?? []).map((s) => String(s).trim()).filter(Boolean))
  );
  await sql`
    INSERT INTO today_gifts (day, slugs, updated_at)
    VALUES (${day}::date, ${JSON.stringify(clean)}::jsonb, NOW())
    ON CONFLICT (day) DO UPDATE
      SET slugs = EXCLUDED.slugs,
          updated_at = NOW()
  `;
}

export async function setTodayGiftItems(dayIso: string, items: TodayGiftItem[]): Promise<void> {
  await ensureTodayGiftsTable();
  const day = dayIso.trim();
  const normalized = normalizeItems(items);
  const slugs = normalized.map((i) => i.slug);
  await sql`
    INSERT INTO today_gifts (day, slugs, items, updated_at)
    VALUES (
      ${day}::date,
      ${JSON.stringify(slugs)}::jsonb,
      ${JSON.stringify(normalized)}::jsonb,
      NOW()
    )
    ON CONFLICT (day) DO UPDATE
      SET slugs = EXCLUDED.slugs,
          items = EXCLUDED.items,
          updated_at = NOW()
  `;
}

