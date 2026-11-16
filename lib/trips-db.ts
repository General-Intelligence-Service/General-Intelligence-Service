import { sql } from "@vercel/postgres";
import { isTodayGiftsDbConfigured } from "@/lib/today-gifts-db";
import type {
  Trip,
  TripGift,
  TripGiftInput,
  TripGiftType,
  TripInput,
  TripReturnGiftInput,
  TripStatus,
} from "@/types/trip";

export type {
  Trip,
  TripGift,
  TripGiftInput,
  TripInput,
  TripGiftType,
  TripReturnGiftInput,
  TripStatus,
} from "@/types/trip";

let initDone = false;

export function isTripsDbConfigured(): boolean {
  return isTodayGiftsDbConfigured();
}

function clampQty(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? "0"), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(999999, Math.floor(v)));
}

function isoDay(v: string): string {
  const day = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date().toISOString().slice(0, 10);
}

function optionalDay(v: string | null | undefined): string | null {
  if (v == null || !String(v).trim()) return null;
  return isoDay(String(v));
}

export async function ensureTripsTables(): Promise<void> {
  if (initDone) return;
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization TEXT NOT NULL,
      recipient TEXT NOT NULL,
      destination TEXT NOT NULL,
      trip_date DATE NOT NULL,
      return_date DATE,
      status VARCHAR(32) NOT NULL DEFAULT 'open',
      notes TEXT,
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS trip_gifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      gift_type VARCHAR(16) NOT NULL,
      product_slug VARCHAR(255),
      product_name TEXT,
      custom_name TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      delivered_to TEXT,
      delivered_qty INTEGER NOT NULL DEFAULT 0,
      returned_qty INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  try {
    await sql`ALTER TABLE trips ADD COLUMN return_date DATE`;
  } catch {
    /* موجود */
  }
  try {
    await sql`ALTER TABLE trip_gifts ADD COLUMN delivered_qty INTEGER NOT NULL DEFAULT 0`;
  } catch {
    /* موجود */
  }
  try {
    await sql`ALTER TABLE trip_gifts ADD COLUMN returned_qty INTEGER NOT NULL DEFAULT 0`;
  } catch {
    /* موجود */
  }
  await sql`CREATE INDEX IF NOT EXISTS trips_trip_date_idx ON trips (trip_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS trip_gifts_trip_id_idx ON trip_gifts (trip_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS inventory (
      sku VARCHAR(64) PRIMARY KEY,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  initDone = true;
}

function mapGift(row: Record<string, unknown>): TripGift {
  return {
    id: String(row.id),
    giftType: row.gift_type === "other" ? "other" : "catalog",
    productSlug: row.product_slug != null ? String(row.product_slug) : null,
    productName: row.product_name != null ? String(row.product_name) : null,
    customName: row.custom_name != null ? String(row.custom_name) : null,
    quantity: clampQty(row.quantity),
    deliveredTo: row.delivered_to != null ? String(row.delivered_to) : null,
    deliveredQty: clampQty(row.delivered_qty),
    returnedQty: clampQty(row.returned_qty),
    notes: row.notes != null ? String(row.notes) : null,
  };
}

function mapTrip(row: Record<string, unknown>, gifts: TripGift[]): Trip {
  const tripDateRaw = row.trip_date;
  const tripDate =
    typeof tripDateRaw === "string"
      ? tripDateRaw.slice(0, 10)
      : tripDateRaw instanceof Date
        ? tripDateRaw.toISOString().slice(0, 10)
        : isoDay(String(tripDateRaw ?? ""));
  const returnRaw = row.return_date;
  let returnDate: string | null = null;
  if (returnRaw != null && returnRaw !== "") {
    returnDate =
      typeof returnRaw === "string"
        ? returnRaw.slice(0, 10)
        : returnRaw instanceof Date
          ? returnRaw.toISOString().slice(0, 10)
          : isoDay(String(returnRaw));
  }
  return {
    id: String(row.id),
    organization: String(row.organization ?? ""),
    recipient: String(row.recipient ?? ""),
    destination: String(row.destination ?? ""),
    tripDate,
    returnDate,
    status: row.status === "returned" ? "returned" : "open",
    notes: row.notes != null ? String(row.notes) : null,
    gifts,
    createdBy: row.created_by != null ? String(row.created_by) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function normalizeGifts(gifts: TripGiftInput[]): TripGiftInput[] {
  const out: TripGiftInput[] = [];
  for (const g of gifts ?? []) {
    const giftType: TripGiftType = g.giftType === "other" ? "other" : "catalog";
    const quantity = Math.max(1, clampQty(g.quantity));
    if (giftType === "catalog") {
      const productSlug = String(g.productSlug ?? "").trim();
      if (!productSlug) continue;
      out.push({
        giftType,
        productSlug,
        customName: null,
        quantity,
        deliveredTo: (g.deliveredTo ?? "").trim() || null,
        deliveredQty: clampQty(g.deliveredQty),
        returnedQty: clampQty(g.returnedQty),
        notes: (g.notes ?? "").trim() || null,
      });
    } else {
      const customName = String(g.customName ?? "").trim();
      if (!customName) continue;
      out.push({
        giftType,
        productSlug: null,
        customName,
        quantity,
        deliveredTo: (g.deliveredTo ?? "").trim() || null,
        deliveredQty: clampQty(g.deliveredQty),
        returnedQty: clampQty(g.returnedQty),
        notes: (g.notes ?? "").trim() || null,
      });
    }
  }
  return out;
}

async function loadGifts(tripId: string): Promise<TripGift[]> {
  const { rows } = await sql`
    SELECT *
    FROM trip_gifts
    WHERE trip_id = ${tripId}::uuid
    ORDER BY created_at ASC
  `;
  return rows.map((r) => mapGift(r as Record<string, unknown>));
}

async function adjustCatalogStock(slug: string, delta: number, dayIso: string, updatedBy?: string): Promise<void> {
  if (!slug || delta === 0) return;

  const { rows: pRows } = await sql`
    SELECT sku, available_quantity
    FROM products
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (pRows.length === 0) {
    throw new Error(`الهدية غير موجودة في المخزون: ${slug}`);
  }
  const sku = String(pRows[0].sku ?? "");
  const current = Number(pRows[0].available_quantity ?? 0);
  if (delta < 0 && current + delta < 0) {
    throw new Error(`الكمية غير كافية في المخزون للهدية (${slug}). المتوفر: ${current}`);
  }

  await sql`
    UPDATE products
    SET available_quantity = GREATEST(0, available_quantity + ${delta}),
        updated_at = NOW()
    WHERE slug = ${slug}
  `;

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
      const { rows: afterRows } = await sql`
        SELECT available_quantity FROM products WHERE slug = ${slug} LIMIT 1
      `;
      const qty = afterRows.length ? Number(afterRows[0].available_quantity ?? 0) : Math.max(0, current + delta);
      await sql`
        INSERT INTO inventory (sku, quantity, updated_at)
        VALUES (${sku}, ${Math.max(0, qty)}, NOW())
      `;
    }
  }

  const outQty = delta < 0 ? Math.abs(delta) : 0;
  const inQty = delta > 0 ? delta : 0;
  try {
    await sql`
      INSERT INTO gift_movements (day, slug, sku, out_qty, in_qty, updated_by, updated_at)
      VALUES (${dayIso}::date, ${slug}, ${sku || null}, ${outQty}, ${inQty}, ${updatedBy ?? null}, NOW())
      ON CONFLICT (day, slug) DO UPDATE
        SET out_qty = GREATEST(0, gift_movements.out_qty + ${outQty}),
            in_qty = GREATEST(0, gift_movements.in_qty + ${inQty}),
            sku = COALESCE(EXCLUDED.sku, gift_movements.sku),
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
    `;
  } catch {
    // gift_movements قد لا يكون جاهزاً
  }
}

async function resolveProductName(slug: string): Promise<string | null> {
  const { rows } = await sql`
    SELECT name FROM products WHERE slug = ${slug} LIMIT 1
  `;
  return rows.length ? String(rows[0].name ?? "") : null;
}

/**
 * يطبّق فرق كميات الهدايا الكتالوجية على المخزون (idempotent عبر مقارنة القيم السابقة).
 */
async function applyStockDeltas(
  previous: TripGift[],
  next: TripGiftInput[],
  dayIso: string,
  updatedBy?: string
): Promise<void> {
  const prevMap = new Map<string, number>();
  for (const g of previous) {
    if (g.giftType !== "catalog" || !g.productSlug) continue;
    prevMap.set(g.productSlug, (prevMap.get(g.productSlug) ?? 0) + g.quantity);
  }
  const nextMap = new Map<string, number>();
  for (const g of next) {
    if (g.giftType !== "catalog" || !g.productSlug) continue;
    nextMap.set(g.productSlug, (nextMap.get(g.productSlug) ?? 0) + g.quantity);
  }

  const slugs = new Set([...prevMap.keys(), ...nextMap.keys()]);
  for (const slug of slugs) {
    const before = prevMap.get(slug) ?? 0;
    const after = nextMap.get(slug) ?? 0;
    await adjustCatalogStock(slug, before - after, dayIso, updatedBy);
  }
}

export async function listTrips(limit = 100): Promise<Trip[]> {
  await ensureTripsTables();
  const { rows } = await sql`
    SELECT *
    FROM trips
    ORDER BY trip_date DESC, created_at DESC
    LIMIT ${Math.max(1, Math.min(500, limit))}
  `;
  const trips: Trip[] = [];
  for (const row of rows) {
    const id = String(row.id);
    const gifts = await loadGifts(id);
    trips.push(mapTrip(row as Record<string, unknown>, gifts));
  }
  return trips;
}

export async function getTrip(id: string): Promise<Trip | null> {
  await ensureTripsTables();
  const { rows } = await sql`
    SELECT * FROM trips WHERE id = ${id}::uuid LIMIT 1
  `;
  if (rows.length === 0) return null;
  const gifts = await loadGifts(id);
  return mapTrip(rows[0] as Record<string, unknown>, gifts);
}

export async function createTrip(input: TripInput, createdBy?: string): Promise<Trip> {
  await ensureTripsTables();
  const gifts = normalizeGifts(input.gifts);
  const organization = String(input.organization ?? "").trim();
  const recipient = String(input.recipient ?? "").trim();
  const destination = String(input.destination ?? "").trim();
  const tripDate = isoDay(input.tripDate);
  const returnDate = optionalDay(input.returnDate);
  const status: TripStatus = input.status === "returned" ? "returned" : "open";
  const notes = (input.notes ?? "").trim() || null;

  if (!organization) throw new Error("اسم الوفد مطلوب");
  if (!recipient) throw new Error("المسؤول مطلوب");
  if (!destination) throw new Error("الوجهة مطلوبة");
  if (gifts.length === 0) throw new Error("أضف هدية واحدة على الأقل");

  await sql`BEGIN`;
  try {
    await applyStockDeltas([], gifts, tripDate, createdBy);

    const { rows } = await sql`
      INSERT INTO trips (organization, recipient, destination, trip_date, return_date, status, notes, created_by)
      VALUES (
        ${organization}, ${recipient}, ${destination}, ${tripDate}::date,
        ${returnDate}::date, ${status}, ${notes}, ${createdBy ?? null}
      )
      RETURNING *
    `;
    const tripId = String(rows[0].id);

    for (const g of gifts) {
      const productName =
        g.giftType === "catalog" && g.productSlug ? await resolveProductName(g.productSlug) : null;
      await sql`
        INSERT INTO trip_gifts (
          trip_id, gift_type, product_slug, product_name, custom_name,
          quantity, delivered_to, delivered_qty, returned_qty, notes
        )
        VALUES (
          ${tripId}::uuid,
          ${g.giftType},
          ${g.productSlug ?? null},
          ${productName},
          ${g.customName ?? null},
          ${g.quantity},
          ${g.deliveredTo ?? null},
          ${0},
          ${0},
          ${g.notes ?? null}
        )
      `;
    }

    await sql`COMMIT`;
    const trip = await getTrip(tripId);
    if (!trip) throw new Error("تعذر قراءة الرحلة بعد الإنشاء");
    return trip;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

export async function updateTrip(id: string, input: TripInput, updatedBy?: string): Promise<Trip> {
  await ensureTripsTables();
  const existing = await getTrip(id);
  if (!existing) throw new Error("الرحلة غير موجودة");
  if (existing.status === "returned") {
    throw new Error("لا يمكن تعديل رحلة مكتملة. استخدم تسجيل العودة إن لزم.");
  }

  const gifts = normalizeGifts(input.gifts);
  const organization = String(input.organization ?? "").trim();
  const recipient = String(input.recipient ?? "").trim();
  const destination = String(input.destination ?? "").trim();
  const tripDate = isoDay(input.tripDate);
  const returnDate = optionalDay(input.returnDate);
  const notes = (input.notes ?? "").trim() || null;

  if (!organization) throw new Error("اسم الوفد مطلوب");
  if (!recipient) throw new Error("المسؤول مطلوب");
  if (!destination) throw new Error("الوجهة مطلوبة");
  if (gifts.length === 0) throw new Error("أضف هدية واحدة على الأقل");

  await sql`BEGIN`;
  try {
    await applyStockDeltas(existing.gifts, gifts, tripDate, updatedBy);

    await sql`
      UPDATE trips
      SET organization = ${organization},
          recipient = ${recipient},
          destination = ${destination},
          trip_date = ${tripDate}::date,
          return_date = ${returnDate}::date,
          notes = ${notes},
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await sql`DELETE FROM trip_gifts WHERE trip_id = ${id}::uuid`;

    for (const g of gifts) {
      const productName =
        g.giftType === "catalog" && g.productSlug ? await resolveProductName(g.productSlug) : null;
      await sql`
        INSERT INTO trip_gifts (
          trip_id, gift_type, product_slug, product_name, custom_name,
          quantity, delivered_to, delivered_qty, returned_qty, notes
        )
        VALUES (
          ${id}::uuid,
          ${g.giftType},
          ${g.productSlug ?? null},
          ${productName},
          ${g.customName ?? null},
          ${g.quantity},
          ${g.deliveredTo ?? null},
          ${0},
          ${0},
          ${g.notes ?? null}
        )
      `;
    }

    await sql`COMMIT`;
    const trip = await getTrip(id);
    if (!trip) throw new Error("تعذر قراءة الرحلة بعد التعديل");
    return trip;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

/**
 * تسجيل عودة الوفد: المُرجعة تعود للمخزون، والحالة تصبح مكتملة.
 */
export async function completeTripReturn(
  id: string,
  items: TripReturnGiftInput[],
  updatedBy?: string,
  actualReturnDate?: string | null
): Promise<Trip> {
  await ensureTripsTables();
  const existing = await getTrip(id);
  if (!existing) throw new Error("الرحلة غير موجودة");
  if (existing.status === "returned") throw new Error("تم تسجيل عودة هذه الرحلة مسبقاً");

  const byId = new Map(items.map((i) => [i.giftId, i]));
  for (const g of existing.gifts) {
    const row = byId.get(g.id);
    if (!row) throw new Error("يجب تحديد المُسلَّمة والمُرجعة لكل هدية");
    const delivered = clampQty(row.deliveredQty);
    const returned = clampQty(row.returnedQty);
    if (delivered + returned !== g.quantity) {
      const label = g.giftType === "other" ? g.customName : g.productName || g.productSlug;
      throw new Error(
        `مجموع المُسلَّمة والمُرجعة يجب أن يساوي المسحوبة (${g.quantity}) للهدية: ${label}`
      );
    }
  }

  const dayIso = optionalDay(actualReturnDate) || isoDay(new Date().toISOString().slice(0, 10));

  await sql`BEGIN`;
  try {
    for (const g of existing.gifts) {
      const row = byId.get(g.id)!;
      const delivered = clampQty(row.deliveredQty);
      const returned = clampQty(row.returnedQty);
      const deliveredTo = (row.deliveredTo ?? g.deliveredTo ?? "").trim() || null;

      await sql`
        UPDATE trip_gifts
        SET delivered_qty = ${delivered},
            returned_qty = ${returned},
            delivered_to = ${deliveredTo},
            updated_at = NOW()
        WHERE id = ${g.id}::uuid
      `;

      if (g.giftType === "catalog" && g.productSlug && returned > 0) {
        await adjustCatalogStock(g.productSlug, returned, dayIso, updatedBy);
      }
    }

    await sql`
      UPDATE trips
      SET status = 'returned',
          return_date = ${dayIso}::date,
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await sql`COMMIT`;
    const trip = await getTrip(id);
    if (!trip) throw new Error("تعذر قراءة الرحلة بعد تسجيل العودة");
    return trip;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}

export async function deleteTrip(id: string, updatedBy?: string): Promise<boolean> {
  await ensureTripsTables();
  const existing = await getTrip(id);
  if (!existing) return false;

  await sql`BEGIN`;
  try {
    if (existing.status === "open") {
      // الرحلة الجارية: إعادة كل الكميات المسحوبة للمخزون
      await applyStockDeltas(existing.gifts, [], existing.tripDate, updatedBy);
    } else {
      // مكتملة: المُرجعة عادت مسبقاً، والمُسلَّمة خرجت نهائياً — لا نلمس المخزون
    }
    await sql`DELETE FROM trips WHERE id = ${id}::uuid`;
    await sql`COMMIT`;
    return true;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
}
