/**
 * توليد slug من اسم المنتج (مطابق لمنطق API في app/api/products/route.ts)
 */
export function generateProductSlug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}
