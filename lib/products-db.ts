import { sql } from "@vercel/postgres";
import { products as initialProducts, type Product, type GiftTier } from "@/data/products";

const PRODUCTS_TABLE = "products";

let initDone = false;

export async function ensureProductsTable(): Promise<void> {
  if (initDone) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        slug VARCHAR(255) PRIMARY KEY,
        sku VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(512) NOT NULL,
        short_description TEXT NOT NULL DEFAULT '',
        contents JSONB NOT NULL DEFAULT '[]',
        gift_tier VARCHAR(32) NOT NULL DEFAULT 'standard',
        images JSONB NOT NULL DEFAULT '[]',
        available_quantity INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(128),
        price VARCHAR(64),
        archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    try {
      await sql`ALTER TABLE products ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* العمود موجود مسبقاً */
    }
    initDone = true;
  } catch (e) {
    console.error("products-db init:", e);
    throw e;
  }
}

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    slug: String(r.slug),
    sku: String(r.sku),
    name: String(r.name),
    shortDescription: String(r.short_description ?? ""),
    contents: Array.isArray(r.contents) ? r.contents.map(String) : [],
    giftTier: (r.gift_tier as GiftTier) || "standard",
    images: Array.isArray(r.images) ? r.images.map(String) : [],
    availableQuantity: typeof r.available_quantity === "number" ? r.available_quantity : 0,
    category: r.category != null ? String(r.category) : undefined,
    price: r.price != null ? String(r.price) : undefined,
    archived: Boolean(r.archived),
  };
}

export async function seedProductsIfEmpty(): Promise<number> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT COUNT(*)::int as c FROM products`;
  const count = Number(rows[0]?.c ?? 0);
  if (count > 0) return count;
  for (const p of initialProducts) {
    await sql`
      INSERT INTO products (slug, sku, name, short_description, contents, gift_tier, images, available_quantity, category, price, updated_at)
      VALUES (
        ${p.slug},
        ${p.sku},
        ${p.name},
        ${p.shortDescription ?? ""},
        ${JSON.stringify(p.contents ?? [])}::jsonb,
        ${p.giftTier},
        ${JSON.stringify(p.images ?? [])}::jsonb,
        ${p.availableQuantity ?? 0},
        ${p.category ?? null},
        ${p.price ?? null},
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  return initialProducts.length;
}

export async function getAllProducts(includeArchived = false): Promise<Product[]> {
  await ensureProductsTable();
  const { rows } = includeArchived
    ? await sql`SELECT * FROM products ORDER BY archived ASC, sku`
    : await sql`SELECT * FROM products WHERE (archived IS NULL OR archived = false) ORDER BY sku`;
  return rows.map(rowToProduct);
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  await ensureProductsTable();
  const normalized = sku.trim();
  const { rows } = await sql`SELECT * FROM products WHERE sku = ${normalized} OR UPPER(sku) = UPPER(${normalized}) LIMIT 1`;
  return rows.length > 0 ? rowToProduct(rows[0]) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await ensureProductsTable();
  const { rows } = await sql`SELECT * FROM products WHERE slug = ${slug.trim()} LIMIT 1`;
  return rows.length > 0 ? rowToProduct(rows[0]) : null;
}

export async function createProduct(p: Product): Promise<Product> {
  await ensureProductsTable();
  await sql`
    INSERT INTO products (slug, sku, name, short_description, contents, gift_tier, images, available_quantity, category, price, updated_at)
    VALUES (
      ${p.slug},
      ${p.sku},
      ${p.name},
      ${p.shortDescription ?? ""},
      ${JSON.stringify(p.contents ?? [])}::jsonb,
      ${p.giftTier},
      ${JSON.stringify(p.images ?? [])}::jsonb,
      ${p.availableQuantity ?? 0},
      ${p.category ?? null},
      ${p.price ?? null},
      NOW()
    )
  `;
  return p;
}

export async function updateProduct(slug: string, updates: Partial<Product>): Promise<Product | null> {
  await ensureProductsTable();
  const { rows: existing } = await sql`SELECT * FROM products WHERE slug = ${slug} LIMIT 1`;
  if (existing.length === 0) return null;
  const current = rowToProduct(existing[0]);
  const merged: Product = {
    ...current,
    ...updates,
    slug: current.slug,
  };
  const archived = merged.archived ?? false;
  await sql`
    UPDATE products SET
      sku = ${merged.sku},
      name = ${merged.name},
      short_description = ${merged.shortDescription ?? ""},
      contents = ${JSON.stringify(merged.contents ?? [])}::jsonb,
      gift_tier = ${merged.giftTier},
      images = ${JSON.stringify(merged.images ?? [])}::jsonb,
      available_quantity = ${merged.availableQuantity ?? 0},
      category = ${merged.category ?? null},
      price = ${merged.price ?? null},
      archived = ${archived},
      updated_at = NOW()
    WHERE slug = ${slug}
  `;
  return merged;
}

/** حذف ناعم: المنتج يُحفظ في القاعدة ويُسجّل أن الكمية منتهية (لا يُحذف فعلياً) */
export async function deleteProduct(slug: string): Promise<boolean> {
  await ensureProductsTable();
  const { rowCount } = await sql`
    UPDATE products SET archived = true, available_quantity = 0, updated_at = NOW() WHERE slug = ${slug}
  `;
  return (rowCount ?? 0) > 0;
}

export function isProductsDbConfigured(): boolean {
  try {
    const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    return Boolean(url && url.length > 0);
  } catch {
    return false;
  }
}
