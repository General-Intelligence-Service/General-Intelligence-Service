"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShoppingCart, Plus, Minus, Share2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/product-card";
import { getProductBySlug, products as initialProducts, getGiftTierLabel, type Product } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useOrder } from "@/contexts/order-context";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [orderQty, setOrderQty] = useState(1);
  const [shareDone, setShareDone] = useState(false);

  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${product.name} - كتالوج الهدايا`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: product.name,
          text,
          url,
        });
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } else {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } catch {
        alert("تعذر نسخ الرابط");
      }
    }
  };

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
          } catch (error) {
            console.error("Error parsing products from localStorage:", error);
            return initialProducts;
          }
        }
      }
      return initialProducts;
    };

    const loaded = loadProducts();
    setAllProducts(loaded);
    
    // البحث عن المنتج - البحث في جميع البيانات المحملة
    // استخدام decodeURIComponent للتعامل مع URLs المشفرة
    const searchSlug = decodeURIComponent(params.slug);
    let foundProduct = loaded.find((p) => {
      const productSlug = decodeURIComponent(p.slug);
      return productSlug === searchSlug || p.slug === searchSlug;
    });
    
    // إذا لم يُوجد، البحث في البيانات الأولية أيضاً
    if (!foundProduct) {
      foundProduct = getProductBySlug(searchSlug);
    }
    
    // تسجيل للمساعدة في التشخيص
    if (!foundProduct) {
      console.log("Product not found. Looking for slug:", searchSlug);
      console.log("Available products:", loaded.map((p) => ({ name: p.name, slug: p.slug })));
      console.log("All slugs:", loaded.map((p) => p.slug));
    } else {
      console.log("Product found:", foundProduct.name, "with slug:", foundProduct.slug);
    }
    
    setProduct(foundProduct);
  }, [params.slug]);

  // عرض loading أثناء التحميل (فقط قبل mount)
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // إذا لم يتم العثور على المنتج بعد تحميل البيانات
  if (mounted && !product) {
    notFound();
  }

  // التأكد من وجود المنتج قبل العرض
  if (!product) {
    return null;
  }

  // Get related products (same gift tier, excluding current)
  const relatedProducts = allProducts
    .filter(
      (p: Product) => p.giftTier === product.giftTier && p.slug !== product.slug
    )
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Link href="/" className="hover:text-brand-green-dark">
                الرئيسية
              </Link>
              <ArrowRight className="h-5 w-5 rotate-180" />
              <Link href="/#products" className="hover:text-brand-green-dark">
                المنتجات
              </Link>
              <ArrowRight className="h-5 w-5 rotate-180" />
              <span className="text-foreground">{product.name}</span>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <section className="py-8 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Images */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted shadow-lg">
                  {product.images && product.images.length > 0 && (product.images[selectedImageIndex] || product.images[0]) ? (
                    <Image
                      src={product.images[selectedImageIndex] || product.images[0]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-opacity duration-300"
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="flex h-full w-full items-center justify-center text-muted-foreground"><span>لا توجد صورة</span></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <span>لا توجد صورة</span>
                    </div>
                  )}
                </div>
                {product.images.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-base font-medium text-muted-foreground">
                      اختر صورة ({selectedImageIndex + 1} من {product.images.length})
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {product.images && product.images.length > 0 && product.images.map((image, index) => (
                        image ? (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                              selectedImageIndex === index
                                ? "border-brand-green-dark ring-2 ring-brand-green-dark ring-offset-2 scale-105"
                                : "border-transparent hover:border-brand-green-dark/50 hover:scale-105"
                            }`}
                          >
                            <Image
                              src={image}
                              alt={`${product.name} - ${index + 1}`}
                              fill
                              sizes="(max-width: 640px) 25vw, 20vw"
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </button>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Product Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-6"
              >
                <div>
                  {product.giftTier && (
                    <div className="mb-3">
                      <Badge 
                        variant={product.giftTier === "luxury" ? "default" : "outline"}
                        className={
                          product.giftTier === "luxury" 
                            ? "bg-brand-gold text-white border-brand-gold" 
                            : product.giftTier === "premium"
                            ? "border-brand-green-dark text-brand-green-dark"
                            : ""
                        }
                      >
                        {getGiftTierLabel(product.giftTier)}
                      </Badge>
                    </div>
                  )}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold md:text-4xl">
                      {product.name}
                    </h1>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="shrink-0"
                    >
                      <Share2 className="ml-2 h-4 w-4" />
                      {shareDone ? "تم النسخ!" : "مشاركة"}
                    </Button>
                  </div>
                  <p className="text-base text-muted-foreground">
                    كود المنتج: <span className="font-semibold">{product.sku}</span>
                  </p>
                  {product.availableQuantity !== undefined && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-base font-medium text-muted-foreground">
                        الكمية المتوفرة:
                      </span>
                      <Badge
                        variant={
                          product.availableQuantity > 5
                            ? "default"
                            : product.availableQuantity > 0
                            ? "secondary"
                            : "destructive"
                        }
                        className={
                          product.availableQuantity > 5
                            ? "bg-brand-green-dark"
                            : product.availableQuantity > 0
                            ? "bg-brand-gold text-white"
                            : ""
                        }
                      >
                        {product.availableQuantity > 0
                          ? `${product.availableQuantity} قطعة`
                          : "غير متوفر"}
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h2 className="mb-3 text-xl font-semibold">الوصف</h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {product.shortDescription}
                  </p>
                </div>

                {product.contents.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xl font-semibold">
                      محتويات الهدية
                    </h2>
                    <ul className="space-y-2">
                      {product.contents.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="mt-1 h-5 w-5 shrink-0 text-brand-green-dark" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-base font-medium text-muted-foreground">أضف للطلبية</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 border rounded-md">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <span className="w-12 text-center text-lg font-semibold tabular-nums">
                        {orderQty}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setOrderQty((q) => Math.min(99, q + 1))}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                    <Button
                      onClick={() => addToOrder(product, orderQty)}
                      variant="outline"
                      className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white h-11 px-6"
                    >
                      <ShoppingCart className="ml-2 h-5 w-5" />
                      أضف للطلبية
                    </Button>
                  </div>
                </div>

                <Separator />

                <a
                  href={generateWhatsAppLink(product.name, product.sku)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker h-11 rounded-md px-8"
                >
                  استفسر عن المنتج
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold md:text-3xl">
                  منتجات مشابهة
                </h2>
              </motion.div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProducts.map((relatedProduct, index) => (
                  <ProductCard
                    key={relatedProduct.slug}
                    product={relatedProduct}
                    index={index}
                    onAddToOrder={addToOrder}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

