"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { products as initialProducts, getAllGiftTiers, getGiftTierLabel, type GiftTier, type Product } from "@/data/products";
import { useOrder } from "@/contexts/order-context";

export default function Home() {
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [selectedGiftTier, setSelectedGiftTier] = useState<GiftTier | null>(null);
  const [mounted, setMounted] = useState(false);

  const giftTiers = getAllGiftTiers();

  // تحميل المنتجات من localStorage بعد mount على العميل فقط
  useEffect(() => {
    setMounted(true);
    const loadProducts = (): Product[] => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("products");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // دمج البيانات المحملة مع البيانات الأولية (للتأكد من عدم فقدان أي منتج)
            const merged = [...initialProducts];
            parsed.forEach((p: Product) => {
              const existingIndex = merged.findIndex((existing) => existing.slug === p.slug);
              if (existingIndex >= 0) {
                merged[existingIndex] = p; // تحديث المنتج الموجود
              } else {
                merged.push(p); // إضافة منتج جديد
              }
            });
            return merged;
          } catch {
            return initialProducts;
          }
        }
      }
      return initialProducts;
    };

    setAllProducts(loadProducts());

    // الاستماع لتغييرات localStorage
    const handleStorageChange = () => {
      setAllProducts(loadProducts());
    };

    window.addEventListener("storage", handleStorageChange);
    // التحقق من التحديثات كل ثانية (للتحديثات من نفس التبويب)
    const interval = setInterval(() => {
      const saved = localStorage.getItem("products");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // دمج البيانات المحملة مع البيانات الأولية
          const merged = [...initialProducts];
          parsed.forEach((p: Product) => {
            const existingIndex = merged.findIndex((existing) => existing.slug === p.slug);
            if (existingIndex >= 0) {
              merged[existingIndex] = p; // تحديث المنتج الموجود
            } else {
              merged.push(p); // إضافة منتج جديد
            }
          });
          setAllProducts((prev) => {
            if (JSON.stringify(merged) !== JSON.stringify(prev)) {
              return merged;
            }
            return prev;
          });
        } catch {}
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesGiftTier =
        selectedGiftTier === null || product.giftTier === selectedGiftTier;
      return matchesGiftTier;
    });
  }, [allProducts, selectedGiftTier]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-brand-green-light/5 to-brand-gold-light/10 py-4">
          <div className="flex justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{ maxWidth: '400px', width: '100%' }}
            >
              <Image
                src="/2.png"
                alt="شعار المعرض"
                width={1500}
                height={1500}
                className="w-full h-auto object-contain"
                priority
              />
            </motion.div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                معرض المنتجات
              </h2>
              <p className="text-muted-foreground">
                تصفح مجموعتنا المتنوعة من الهدايا الفاخرة والتراثية المعروضة
              </p>
            </motion.div>

            {/* Filters */}
            <div className="mb-8 space-y-4">
              {/* تصنيف الهدايا */}
              <div>
                <p className="mb-3 text-base font-semibold text-foreground">تصنيف الهدايا:</p>
                <div className="flex flex-wrap gap-3">
                  <Badge
                    variant={selectedGiftTier === null ? "default" : "outline"}
                    className="cursor-pointer text-base px-4 py-1.5"
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
                      className="cursor-pointer text-base px-4 py-1.5"
                      onClick={() => setSelectedGiftTier(tier)}
                    >
                      {getGiftTierLabel(tier)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    index={index}
                    onAddToOrder={addToOrder}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">
                  لم يتم العثور على منتجات تطابق البحث
                </p>
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

