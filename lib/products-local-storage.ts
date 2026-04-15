import { products as initialProducts, type Product } from "@/data/products";

export const PRODUCTS_STORAGE_KEY = "products";

/**
 * للعرض العام (الموقع، البحث، صفحة المنتج، الطلبية):
 * قراءة localStorage دون دمجها مع القائمة الثابتة — لأن الدمج كان يُعيد ظهور المنتجات
 * المؤرشفة من لوحة التحكم (الحذف الناعم) ما دامت لا تزال في data/products.ts.
 */
export function loadPublicProductsFromLocalStorage(): Product[] {
  const fallback = () => initialProducts.filter((p) => !p.archived && !p.hidden);
  if (typeof window === "undefined") return fallback();
  try {
    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!saved) return fallback();
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return fallback();
    return parsed.filter(
      (p): p is Product =>
        p != null &&
        typeof p === "object" &&
        typeof (p as Product).slug === "string" &&
        !(p as Product).archived &&
        !(p as Product).hidden
    );
  } catch {
    return fallback();
  }
}

export function notifyProductsStorageChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("gift-catalog-products-changed"));
  } catch {
    //
  }
}
