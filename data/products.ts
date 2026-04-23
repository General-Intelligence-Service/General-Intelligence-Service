export type GiftTier = "standard" | "premium" | "luxury";

export interface Product {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  contents: string[];
  price?: string;
  category?: string;
  giftTier: GiftTier;
  images: string[];
  availableQuantity?: number;
  archived?: boolean;
  hidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * صورة معاينة فقط عند عدم رفع صور للهدية — ليست منتجاً حقيقياً.
 * يمكن استبدال الملف تحت public/images/ بأي تصميم تفضّله.
 */
export const PLACEHOLDER_PRODUCT_IMAGE = "/images/placeholder-preview.svg";

export function getProductDisplayImage(product: Product): string {
  const first = product.images?.find((u) => typeof u === "string" && u.trim());
  return (first && first.trim()) || PLACEHOLDER_PRODUCT_IMAGE;
}

export function isExternalOrArchiveImageSrc(src: string): boolean {
  return src.includes("/archive-images/") || src.startsWith("http");
}

/** منتجات كانت تعتمد مجلد public/archive-images (لم يعد هناك كتالوج أرشيف في الكود) */
export function isArchiveCatalogProduct(product: Product): boolean {
  return (product.images ?? []).some(
    (src) => typeof src === "string" && src.includes("/archive-images/")
  );
}

/**
 * القائمة الابتدائية فارغة: أضِف هدايا من لوحة التحكم، أو عبّئ هذا المصفوفة يدوياً.
 * بدون قاعدة بيانات يُعرض الموقع هذه القائمة؛ مع Postgres تُجلب الصفوف من الجدول (ولا يُحذف تلقائياً).
 */
export const products: Product[] = [];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku || p.sku.toUpperCase() === sku.toUpperCase());
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((product) => product.category === category);
}

export function getAllCategories(): string[] {
  const categories = products
    .map((product) => product.category)
    .filter((cat): cat is string => cat !== undefined);
  return Array.from(new Set(categories));
}

export function getAllGiftTiers(): GiftTier[] {
  return ["standard", "premium", "luxury"];
}

export function getGiftTierLabel(tier: GiftTier): string {
  const labels: Record<GiftTier, string> = {
    standard: "قياسية",
    premium: "مميزة",
    luxury: "فاخرة",
  };
  return labels[tier];
}

export function getProductsByGiftTier(tier: GiftTier): Product[] {
  return products.filter((product) => product.giftTier === tier);
}

export function generateNextSKU(): string {
  const skuNumbers = products
    .map((p) => {
      const match = p.sku.match(/G(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  const maxNumber = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;
  const nextNumber = maxNumber + 1;
  return `G${nextNumber.toString().padStart(2, "0")}`;
}
