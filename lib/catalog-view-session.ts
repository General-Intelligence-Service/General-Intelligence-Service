const KEY = "gift_catalog_view_v1";

export type CatalogViewSnapshot = {
  href: string;
  scrollY: number;
  updatedAt: number;
};

export function saveCatalogViewSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    const snap: CatalogViewSnapshot = {
      href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      scrollY: window.scrollY || 0,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // ignore
  }
}

export function consumeCatalogViewSnapshot(): CatalogViewSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogViewSnapshot;
    if (!parsed || typeof parsed.href !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCatalogViewSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
