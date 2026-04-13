"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { QuickViewModal } from "@/components/quick-view-modal";
import { Badge } from "@/components/ui/badge";
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

function HomeContent() {
  const searchParams = useSearchParams();
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [selectedGiftTier, setSelectedGiftTier] = useState<GiftTier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [luxuryCatalogLoading, setLuxuryCatalogLoading] = useState(false);
  const handleDownloadCatalog = async () => {
    if (catalogLoading) return;
    setCatalogLoading(true);
    try {
      const { downloadCatalogPDF } = await import("@/lib/catalog-pdf");
      await downloadCatalogPDF(allProducts, siteConfig);
    } catch (e) {
      console.error(e);
      alert("تعذر إنشاء كتالوج PDF");
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleDownloadLuxuryCatalog = async () => {
    if (luxuryCatalogLoading) return;
    setLuxuryCatalogLoading(true);
    try {
      const { downloadLuxuryCatalogPDF } = await import("@/lib/catalog-pdf");
      await downloadLuxuryCatalogPDF(allProducts, siteConfig);
    } catch (e) {
      console.error(e);
      alert("تعذر إنشاء كتالوج الهدايا الفاخرة");
    } finally {
      setLuxuryCatalogLoading(false);
    }
  };

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

  // تحميل المنتجات: من API (قاعدة البيانات) ثم localStorage ثم الافتراضي
  useEffect(() => {
    setMounted(true);
    const loadFromStorage = (): Product[] => {
      if (typeof window === "undefined") return initialProducts;
      const saved = localStorage.getItem("products");
      if (!saved) return initialProducts;
      try {
        const parsed = JSON.parse(saved);
        const merged = [...initialProducts];
        parsed.forEach((p: Product) => {
          const i = merged.findIndex((existing) => existing.slug === p.slug);
          if (i >= 0) merged[i] = p;
          else merged.push(p);
        });
        return merged;
      } catch {
        return initialProducts;
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAllProducts(json.data);
          if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(json.data));
          return;
        }
      } catch {
        //
      }
      setAllProducts(loadFromStorage());
    };
    fetchProducts();

    const AUTO_REFRESH_MS = 45 * 1000;
    const refreshTimer = setInterval(fetchProducts, AUTO_REFRESH_MS);

    // الاستماع لتغييرات localStorage
    const handleStorageChange = () => {
      setAllProducts(loadFromStorage());
    };

    window.addEventListener("storage", handleStorageChange);
    // التحقق من التحديثات كل ثانية (للتحديثات من نفس التبويب)
    const interval = setInterval(() => {
      const next = loadFromStorage();
      setAllProducts((prev) => (JSON.stringify(next) !== JSON.stringify(prev) ? next : prev));
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
      clearInterval(refreshTimer);
    };
  }, []);

  const filteredByFilters = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesGiftTier =
        selectedGiftTier === null || product.giftTier === selectedGiftTier;
      return matchesGiftTier;
    });
  }, [allProducts, selectedGiftTier]);

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

  const filteredProducts = filteredProductsRaw;

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedGiftTier !== null;

  const { archiveGridProducts, catalogGridProducts } = useMemo(() => {
    const archive = filteredProducts.filter(isArchiveCatalogProduct);
    const catalog = filteredProducts.filter((p) => !isArchiveCatalogProduct(p));
    return { archiveGridProducts: archive, catalogGridProducts: catalog };
  }, [filteredProducts]);

  const renderProductGrid = (list: Product[], keyPrefix: string) => (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
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
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-brand-green-light/5 to-brand-gold-light/10 py-4 pb-8">
          <div className="flex flex-col items-center justify-center gap-4 px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl"
            >
              <Image
                src={siteConfig.logoPath}
                alt={siteConfig.logoAlt}
                width={900}
                height={320}
                className="w-full h-auto object-contain"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 768px"
              />
            </motion.div>
            <Link
              href="#products"
              className="inline-flex min-h-[48px] h-12 items-center justify-center rounded-md border border-brand-green-dark/50 bg-background px-8 text-base font-medium text-brand-green-dark shadow-sm transition-all hover:bg-brand-green-dark/10 hover:border-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              تصفح معرض الهدايا
            </Link>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-6 sm:py-14 md:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                معرض الهدايا
              </h2>
              <p className="text-muted-foreground">
                تصفح مجموعتنا المتنوعة من الهدايا الفاخرة والتراثية المعروضة
              </p>
            </motion.div>

            {/* بحث مع اقتراحات */}
            <div className="relative mb-6 max-w-md mx-auto">
              <input
                type="text"
                placeholder="ابحث عن هدية بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-10 text-right focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {correctedSearchQuery && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-right">
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
                <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border bg-background shadow-lg">
                  {searchSuggestions.map((p) => (
                    <li key={p.slug}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-right text-sm hover:bg-muted"
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

            {/* Filters + ترتيب */}
            <div className="mb-8 space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">تصدير الكتالوج</p>
                <p className="mt-1 max-w-xl mx-auto text-xs text-muted-foreground">
                  الكتالوج الكامل لجميع المعروضات؛ وكتالوج منفصل للهدايا الفاخرة يتضمن الكمية المتوفرة ورموز QR تفتح صفحة كل هدية على الموقع.
                </p>
              </div>
              <div
                className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
                role="group"
                aria-label="أزرار تحميل كتالوج PDF"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleDownloadCatalog}
                  disabled={catalogLoading || luxuryCatalogLoading}
                  aria-busy={catalogLoading}
                >
                  {catalogLoading ? "جاري إنشاء كتالوج PDF..." : "تحميل كتالوج PDF كامل"}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="min-h-[44px] bg-brand-green-dark hover:bg-brand-green-darker"
                  onClick={handleDownloadLuxuryCatalog}
                  disabled={luxuryCatalogLoading || catalogLoading}
                  aria-busy={luxuryCatalogLoading}
                >
                  {luxuryCatalogLoading
                    ? "جاري إنشاء كتالوج الفاخرة..."
                    : "تحميل كتالوج الهدايا الفاخرة (كمية + QR)"}
                </Button>
              </div>
              <div>
                <p className="mb-3 text-base font-semibold text-foreground">تصنيف الهدايا:</p>
                <div className="flex flex-wrap gap-3">
                  <Badge
                    variant={selectedGiftTier === null ? "default" : "outline"}
                    className="cursor-pointer text-base px-4 py-2 min-h-[44px] inline-flex items-center transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                    onClick={() => setSelectedGiftTier(null)}
                  >
                    الكل
                  </Badge>
                  {giftTiers.map((tier) => (
                    <Badge
                      key={tier}
                      variant={
                        selectedGiftTier === tier ? "default" : "outline"
                      }
                      className="cursor-pointer text-base px-4 py-2 min-h-[44px] inline-flex items-center transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      onClick={() => setSelectedGiftTier(tier)}
                    >
                      {getGiftTierLabel(tier)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* شبكة المنتجات: عناصر الأرشيف أولاً ثم باقي الكتالوج */}
            {filteredProducts.length > 0 ? (
              <div className="space-y-6 sm:space-y-12">
                {archiveGridProducts.length > 0 && (
                  <div>{renderProductGrid(archiveGridProducts, "arch")}</div>
                )}
                {catalogGridProducts.length > 0 && (
                  <div>{renderProductGrid(catalogGridProducts, "cat")}</div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <p className="text-lg text-muted-foreground">
                  لم يتم العثور على هدايا تطابق البحث أو التصفية
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-[44px]"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedGiftTier(null);
                    }}
                  >
                    مسح البحث والتصفية
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

      </main>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
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

