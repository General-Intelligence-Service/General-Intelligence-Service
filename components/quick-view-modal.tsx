"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product, getGiftTierLabel, getProductDisplayImage } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { saveCatalogViewSnapshot } from "@/lib/catalog-view-session";

interface QuickViewModalProps {
  product: Product;
  /** قائمة المنتجات الحالية (مثلاً بعد التصفية/البحث) للتنقل بينها */
  products: Product[];
  onNavigate: (product: Product) => void;
  onClose: () => void;
  onAddToOrder: (product: Product, quantity?: number) => void;
}

export function QuickViewModal({
  product,
  products,
  onNavigate,
  onClose,
  onAddToOrder,
}: QuickViewModalProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const index = useMemo(() => {
    const i = products.findIndex((p) => p.slug === product.slug);
    return i >= 0 ? i : 0;
  }, [products, product.slug]);

  const total = products.length;
  const canNavigate = total > 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      if (!canNavigate) return;
      setDirection(delta);
      const nextIndex = (index + delta + total) % total;
      const next = products[nextIndex];
      if (next) {
        setQty(1);
        onNavigate(next);
      }
    },
    [canNavigate, index, onNavigate, products, total]
  );

  const handleAdd = () => {
    onAddToOrder(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;
    const vx = info.velocity.x;
    if (x < -70 || vx < -600) go(1);
    else if (x > 70 || vx > 600) go(-1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="عرض سريع"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 z-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-background/80 p-2 shadow transition-all duration-200 hover:bg-muted hover:shadow-md active:scale-95"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          <div className="relative">
            {canNavigate && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 rounded-full shadow sm:inline-flex"
                  onClick={() => go(1)}
                  aria-label="السابق"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 rounded-full shadow sm:inline-flex"
                  onClick={() => go(-1)}
                  aria-label="التالي"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </>
            )}

            <div className="relative aspect-square w-full touch-pan-y bg-white dark:bg-muted">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={product.slug}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0"
                  drag={canNavigate ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  onDragEnd={onDragEnd}
                >
                  <Image
                    src={getProductDisplayImage(product)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 512px) 100vw, 512px"
                    className="object-contain select-none"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {canNavigate && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {index + 1} / {total}
                </span>
                <span className="sm:hidden">اسحب يمين/يسار للتنقل</span>
                <span className="hidden sm:inline">استخدم أسهم لوحة المفاتيح للتنقل</span>
              </div>
            )}
            {product.giftTier && (
              <Badge variant={product.giftTier === "luxury" ? "default" : "outline"}>
                {getGiftTierLabel(product.giftTier)}
              </Badge>
            )}
            <h2 className="text-xl font-bold">{product.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>كود: {product.sku}</span>
              <span>العدد المتوفر: {product.availableQuantity ?? 0}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{product.shortDescription}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => setQty((n) => Math.min(99, n + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {added ? (
                <span className="min-h-[44px] inline-flex items-center text-sm font-medium text-green-600">تمت الإضافة</span>
              ) : (
                <Button size="sm" onClick={handleAdd} className="min-h-[44px] border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white hover:shadow-md active:bg-brand-gold/90">
                  <ShoppingCart className="ml-2 h-4 w-4" />
                  أضف للطلبية
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-3">
              <Link
                href={`/products/${product.slug}`}
                scroll={false}
                onClick={() => {
                  saveCatalogViewSnapshot();
                  onClose();
                }}
              >
                <Button variant="outline" size="sm" className="w-full min-h-[44px]">عرض كامل</Button>
              </Link>
              <a href={generateWhatsAppLink(product.name, product.sku)} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="w-full min-h-[44px] bg-brand-green-dark hover:bg-brand-green-darker">استفسر</Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
