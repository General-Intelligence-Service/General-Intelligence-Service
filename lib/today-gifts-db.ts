import { sql } from "@vercel/postgres";

const TODAY_GIFTS_TABLE = "today_gifts";

let initDone = false;

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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
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

