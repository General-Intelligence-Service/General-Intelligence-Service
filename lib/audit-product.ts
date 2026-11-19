import type { Product } from "@/data/products";
import type { AuditChangeMap } from "@/lib/audit-log";
import { diffFields } from "@/lib/audit-log";

const PRODUCT_FIELDS = [
  "name",
  "sku",
  "shortDescription",
  "contents",
  "giftTier",
  "images",
  "availableQuantity",
  "category",
  "price",
  "archived",
  "hidden",
] as const;

export function productSnapshot(p: Product): Record<string, unknown> {
  return {
    name: p.name,
    sku: p.sku,
    shortDescription: p.shortDescription,
    contents: p.contents,
    giftTier: p.giftTier,
    images: p.images,
    availableQuantity: p.availableQuantity,
    category: p.category ?? null,
    price: p.price ?? null,
    archived: Boolean(p.archived),
    hidden: Boolean(p.hidden),
  };
}

export function productDiff(before: Product, after: Product): AuditChangeMap {
  return diffFields(productSnapshot(before), productSnapshot(after), [
    ...PRODUCT_FIELDS,
  ]);
}

export function classifyProductUpdateAction(
  before: Product,
  after: Product,
  changes: AuditChangeMap
): string {
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === "hidden") {
    return after.hidden ? "product.hide" : "product.show";
  }
  if (keys.length === 1 && keys[0] === "availableQuantity") {
    return "product.qty_change";
  }
  return "product.update";
}
