"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import {
  catalogFilterTransition,
  catalogTransition,
} from "@/lib/catalog-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-card-skeleton";
import { QuickViewModal } from "@/components/quick-view-modal";
import { Button } from "@/components/ui/button";
import {
  products as initialProducts,
  getAllGiftTiers,
  getGiftTierLabel,
  isArchiveCatalogProduct,
  type GiftTier,
  type Product,
} from "@/data/products";
import { useOrder } from "@/contexts/order-context";
import { siteConfig } from "@/lib/config";
import {
  loadPublicProductsFromLocalStorage,
  PRODUCTS_STORAGE_KEY,
} from "@/lib/products-local-storage";
import {
  clearCatalogViewSnapshot,
  consumeCatalogViewSnapshot,
} from "@/lib/catalog-view-session";
import { applyProductCopyFixesList } from "@/lib/product-copy-fixes";
import { cn } from "@/lib/utils";

type CatalogSort = "default" | "available" | "luxury";

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "default", label: "الافتراضي" },
  { value: "available", label: "المتوفر أولاً" },
  { value: "luxury", label: "الفاخرة أولاً" },
];

function applyArabicSearchCorrections(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";

  // تصحيحات شائعة (قابلة للتوسيع لاحقاً)
  const phraseMap: Array<[RegExp, string]> = [
    [/\bهديه\b/g, "هدية"],
    [/\bهدايا\b/g, "هدايا"], // placeholder to keep list structure
    [/\bفاخره\b/g, "فاخرة"],
    [/\bرسميه\b/g, "رسمية"],
    [/\bمكتبيه\b/g, "مكتبية"],
    [/\bترويجيه\b/g, "ترويجية"],
  ];

  let out = s;
  for (const [re, rep] of phraseMap) out = out.replace(re, rep);

  // تحسينات بسيطة لكتابة العربية
  out = out
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ة") // نتركها كما هي (تعديلها قد يفسد كلمات صحيحة)
    .replace(/ـ/g, "") // تطويل
    .replace(/\s+/g, " ");

  return out;
}

function skuSortKey(sku: string | undefined): number {
  const s = (sku ?? "").trim();
  const m = s.match(/(\d+)/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function compareProductsForCatalog(a: Product, b: Product): number {
  const ak = skuSortKey(a.sku);
  const bk = skuSortKey(b.sku);
  if (ak !== bk) return ak - bk;
  const as = (a.sku ?? "").localeCompare(b.sku ?? "", "en");
  if (as !== 0) return as;
  return a.name.localeCompare(b.name, "ar");
}

function stockRank(p: Product): number {
  return (p.availableQuantity ?? 0) <= 0 ? 1 : 0;
}

function compareWithSort(a: Product, b: Product, sort: CatalogSort): number {
  const stockCmp = stockRank(a) - stockRank(b);
  if (stockCmp !== 0) return stockCmp;
  if (sort === "available") {
    const qa = a.availableQuantity ?? 0;
    const qb = b.availableQuantity ?? 0;
    if (qb !== qa) return qb - qa;
  }
  if (sort === "luxury") {
    const rank = (t?: GiftTier) => (t === "luxury" ? 0 : t === "premium" ? 1 : 2);
    const tr = rank(a.giftTier) - rank(b.giftTier);
    if (tr !== 0) return tr;
  }
  return compareProductsForCatalog(a, b);
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    applyProductCopyFixesList(initialProducts)
  );
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedGiftTier, setSelectedGiftTier] = useState<GiftTier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<CatalogSort>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  /** شعار الهيرو: نسخة داكنة/فاتحة إن وُجدت، مع فلتر أبيض لأن خلفية الـ Hero خضراء دائماً */
  const heroLogoSrc = `${siteConfig.logoDarkPath || siteConfig.logoPath}?v=${siteConfig.logoAssetVersion}`;
  const logoWidth = 2400;
  const logoHeight = 650;

  useEffect(() => {
    if (!sortOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  // عند الرجوع من صفحة منتج: استعد URL الكتالوج + موضع التمرير (بدل “قفزة” للواجهة الافتراضية)
  useEffect(() => {
    const snap = consumeCatalogViewSnapshot();
    if (!snap) return;

    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (snap.href && snap.href !== here) {
      router.replace(snap.href, { scroll: false });
    }

    const y = Number.isFinite(snap.scrollY) ? snap.scrollY : 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: "auto" });
    });

    clearCatalogViewSnapshot();
  }, [router]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const giftTiers = getAllGiftTiers();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const n = parseInt(localStorage.getItem("visit_count") ?? "0", 10);
        localStorage.setItem("visit_count", String(n + 1));
      } catch {}
    }
  }, []);

  // تحميل المنتجات: من API ثم localStorage العام (بدون دمج مع القائمة الثابتة — يمنع عودة المحذوف)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const fixed = applyProductCopyFixesList(json.data);
          setAllProducts(fixed);
          if (typeof window !== "undefined") {
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(fixed));
          }
          return;
        }
      } catch {
        //
      }
      setAllProducts(applyProductCopyFixesList(loadPublicProductsFromLocalStorage()));
    };

    void (async () => {
      await fetchProducts();
      setProductsLoading(false);
    })();

    const AUTO_REFRESH_MS = 45 * 1000;
    const refreshTimer = setInterval(() => void fetchProducts(), AUTO_REFRESH_MS);

    const handleStorageChange = () => {
      setAllProducts(applyProductCopyFixesList(loadPublicProductsFromLocalStorage()));
    };

    const handleCatalogNotify = () => {
      void fetchProducts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("gift-catalog-products-changed", handleCatalogNotify);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("gift-catalog-products-changed", handleCatalogNotify);
      clearInterval(refreshTimer);
    };
  }, []);

  const visibleProducts = useMemo(
    () => allProducts.filter((p) => !p.archived && !p.hidden),
    [allProducts]
  );

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: visibleProducts.length };
    for (const tier of getAllGiftTiers()) {
      counts[tier] = visibleProducts.filter((p) => p.giftTier === tier).length;
    }
    return counts;
  }, [visibleProducts]);

  const filteredByFilters = useMemo(() => {
    return visibleProducts.filter((product) => {
      const matchesGiftTier =
        selectedGiftTier === null || product.giftTier === selectedGiftTier;
      const matchesStock = !inStockOnly || (product.availableQuantity ?? 0) > 0;
      return matchesGiftTier && matchesStock;
    });
  }, [visibleProducts, selectedGiftTier, inStockOnly]);

  const searchLower = searchQuery.trim().toLowerCase();
  const correctedSearchQuery = useMemo(() => {
    // نعتمد التصحيح على النص الأصلي (قبل toLowerCase) كي نُظهره للمستخدم بشكل طبيعي
    const corrected = applyArabicSearchCorrections(searchQuery);
    if (!corrected) return "";
    // لا تعرض اقتراحاً إذا كان مطابقاً فعلياً
    if (corrected.trim() === searchQuery.trim()) return "";
    return corrected;
  }, [searchQuery]);

  const searchSuggestions = useMemo(() => {
    if (!searchLower || searchLower.length < 1) return [];
    return filteredByFilters
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.sku && p.sku.toLowerCase().includes(searchLower))
      )
      .slice(0, 8);
  }, [filteredByFilters, searchLower]);

  const filteredProductsRaw = useMemo(() => {
    if (!searchLower) return filteredByFilters;
    return filteredByFilters.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower))
    );
  }, [filteredByFilters, searchLower]);

  const filteredProducts = useMemo(() => {
    return filteredProductsRaw.slice().sort((a, b) => compareWithSort(a, b, sortBy));
  }, [filteredProductsRaw, sortBy]);

  const quickViewList = useMemo(() => {
    if (!quickViewProduct) return [];
    const base = filteredProducts;
    const exists = base.some((p) => p.slug === quickViewProduct.slug);
    const merged = exists ? base : [...base, quickViewProduct];
    return merged.slice().sort((a, b) => compareWithSort(a, b, sortBy));
  }, [filteredProducts, quickViewProduct, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedGiftTier !== null || inStockOnly;
  const catalogIsEmpty = visibleProducts.length === 0;

  const catalogFilterKey = `${selectedGiftTier ?? "all"}__${searchLower}__${sortBy}__${inStockOnly ? "stock" : "all"}`;

  const { archiveGridProducts, catalogGridProducts } = useMemo(() => {
    const archive = filteredProducts
      .filter(isArchiveCatalogProduct)
      .slice()
      .sort((a, b) => compareWithSort(a, b, sortBy));
    const catalog = filteredProducts
      .filter((p) => !isArchiveCatalogProduct(p))
      .slice()
      .sort((a, b) => compareWithSort(a, b, sortBy));
    return { archiveGridProducts: archive, catalogGridProducts: catalog };
  }, [filteredProducts, sortBy]);

  const renderProductGrid = (list: Product[], keyPrefix: string) => (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {list.map((product, index) => (
        <ProductCard
          key={`${keyPrefix}-${product.slug}`}
          product={product}
          index={index}
          onAddToOrder={addToOrder}
          onQuickView={setQuickViewProduct}
        />
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="site-hero">
          <div className="container relative z-[1] mx-auto px-4 py-12 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={catalogTransition}
              >
                <Image
                  src={heroLogoSrc}
                  alt={siteConfig.logoAlt}
                  width={logoWidth}
                  height={logoHeight}
                  className="site-hero-logo mx-auto h-auto w-full max-w-[480px] object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  priority
                  sizes="(max-width: 640px) 92vw, 480px"
                />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...catalogTransition, delay: 0.06 }}
                className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
              >
                المجموعة الرسمية للهدايا
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...catalogTransition, delay: 0.1 }}
                className="mx-auto mt-3 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg"
              >
                {siteConfig.description} — تصفّح المجموعة وأضف ما تحتاجه إلى طلبك بسهولة.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...catalogTransition, delay: 0.14 }}
                className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button
                  className="min-h-[48px] border border-brand-gold/40 bg-brand-gold px-7 text-base font-bold text-brand-green-darker hover:bg-brand-gold-light"
                  onClick={() => {
                    document
                      .getElementById("products")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  تصفح الهدايا
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[48px] border-white/35 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"
                  onClick={() => router.push("/present")}
                >
                  عرض تقديمي
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...catalogTransition, delay: 0.2 }}
                className="mt-6 text-sm text-white/85"
              >
                {visibleProducts.length} هدية · {giftTiers.length} تصنيفات · طلب PDF فوري
              </motion.p>
            </div>
          </div>
        </section>

        <div className="gold-fade-rule my-2" aria-hidden />

        <section id="products" className="site-section-wash py-8 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-brand-green-dark md:text-4xl dark:text-brand-gold-light">
                معرض الهدايا
              </h2>
              <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-brand-gold" aria-hidden />
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                ابحث بالاسم أو الكود، وصفِّ حسب التصنيف.
              </p>
            </div>

            <div className="catalog-sticky-bar mb-6 space-y-4 sm:mb-8 sm:space-y-5">
              <div className="relative mx-auto max-w-lg">
                <input
                  type="text"
                  placeholder="ابحث عن هدية بالاسم أو الكود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="w-full rounded-lg border border-brand-gold/25 bg-card px-4 py-3 text-right transition focus:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-green/25"
                />
                {correctedSearchQuery && (
                  <div className="mt-2 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-right">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        هل تقصد:{" "}
                        <span className="font-semibold text-foreground">{correctedSearchQuery}</span>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => {
                          setSearchQuery(correctedSearchQuery);
                          setSearchFocused(false);
                        }}
                      >
                        تطبيق التصحيح
                      </Button>
                    </div>
                  </div>
                )}
                {(searchFocused || searchQuery) && searchSuggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-brand-gold/20 bg-card shadow-lg">
                    {searchSuggestions.map((p) => (
                      <li key={p.slug}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-right text-sm transition hover:bg-brand-green/5"
                          onClick={() => {
                            setSearchQuery(p.name);
                            setSearchFocused(false);
                          }}
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.sku && <span className="mr-2 text-muted-foreground">— {p.sku}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <motion.div
                layout
                transition={catalogFilterTransition}
                className="flex flex-wrap justify-center gap-2 sm:justify-start"
              >
                <button
                  type="button"
                  className={`filter-chip ${selectedGiftTier === null ? "filter-chip-active" : "filter-chip-idle"}`}
                  onClick={() => setSelectedGiftTier(null)}
                >
                  الكل ({tierCounts.all ?? 0})
                </button>
                {giftTiers.map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    className={`filter-chip ${selectedGiftTier === tier ? "filter-chip-active" : "filter-chip-idle"}`}
                    onClick={() => setSelectedGiftTier(tier)}
                  >
                    {getGiftTierLabel(tier)} ({tierCounts[tier] ?? 0})
                  </button>
                ))}
              </motion.div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm" ref={sortRef}>
                  <span className="text-muted-foreground">ترتيب:</span>
                  <div className="relative">
                    <button
                      type="button"
                      className={cn(
                        "filter-chip inline-flex min-h-[44px] items-center gap-2 px-4",
                        sortOpen ? "filter-chip-active" : "filter-chip-idle"
                      )}
                      aria-haspopup="listbox"
                      aria-expanded={sortOpen}
                      onClick={() => setSortOpen((o) => !o)}
                    >
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "الافتراضي"}
                      <ChevronDown className={cn("h-4 w-4 transition", sortOpen && "rotate-180")} />
                    </button>
                    {sortOpen && (
                      <ul
                        role="listbox"
                        className="absolute right-0 z-40 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-background p-1 shadow-lg"
                      >
                        {SORT_OPTIONS.map((opt) => {
                          const active = sortBy === opt.value;
                          return (
                            <li key={opt.value} role="option" aria-selected={active}>
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                                  active
                                    ? "bg-brand-green-dark text-white dark:bg-brand-gold dark:text-brand-green-darker"
                                    : "hover:bg-muted"
                                )}
                                onClick={() => {
                                  setSortBy(opt.value);
                                  setSortOpen(false);
                                }}
                              >
                                <span>{opt.label}</span>
                                {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="h-4 w-4 accent-brand-green-dark"
                  />
                  المتوفر فقط
                </label>
              </div>
            </div>

            {productsLoading ? (
              <ProductGridSkeleton count={8} />
            ) : (
              <AnimatePresence mode="wait">
                {filteredProducts.length > 0 ? (
                  <motion.div
                    key={catalogFilterKey}
                    role="region"
                    aria-live="polite"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={catalogFilterTransition}
                    className="space-y-6 sm:space-y-10"
                  >
                    {archiveGridProducts.length > 0 && (
                      <div>{renderProductGrid(archiveGridProducts, "arch")}</div>
                    )}
                    {catalogGridProducts.length > 0 && (
                      <div>{renderProductGrid(catalogGridProducts, "cat")}</div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${catalogFilterKey}`}
                    role="status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={catalogFilterTransition}
                    className="space-y-4 py-12 text-center"
                  >
                    <p className="text-lg text-muted-foreground">
                      {catalogIsEmpty && !hasActiveFilters
                        ? "لا توجد هدايا في الكتالوج حالياً."
                        : "لم نعثر على نتائج مطابقة لبحثك."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[44px]"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedGiftTier(null);
                          setInStockOnly(false);
                        }}
                      >
                        مسح البحث
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </section>
      </main>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          products={quickViewList}
          onNavigate={(p) => setQuickViewProduct(p)}
          onClose={() => setQuickViewProduct(null)}
          onAddToOrder={addToOrder}
        />
      )}

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </main>
          <Footer />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

