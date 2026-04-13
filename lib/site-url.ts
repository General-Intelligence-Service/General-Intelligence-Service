/**
 * أصل الموقع لبناء روابط الصفحات ورموز QR (يفضّل ضبط NEXT_PUBLIC_SITE_URL في الإنتاج).
 */
export function getSiteOriginForShare(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : undefined;
  if (env) {
    return env.replace(/\/+$/, "");
  }
  return "";
}

export function productPageUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/, "");
  const path = `/products/${encodeURIComponent(slug)}`;
  return `${base}${path}`;
}
