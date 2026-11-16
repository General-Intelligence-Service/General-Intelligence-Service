"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { catalogStagger, catalogTransition } from "@/lib/catalog-motion";
import { Plus, Minus, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Product,
  getGiftTierLabel,
  getProductDisplayImage,
  isExternalOrArchiveImageSrc,
  type GiftTier,
} from "@/data/products";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { saveCatalogViewSnapshot } from "@/lib/catalog-view-session";
import { cn } from "@/lib/utils";
import { useOrder } from "@/contexts/order-context";
import { InquireLink } from "@/components/inquire-link";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToOrder?: (product: Product, quantity?: number) => void;
  onQuickView?: (product: Product) => void;
}

function tierBadgeClass(tier: GiftTier): string {
  if (tier === "luxury") return "bg-brand-gold text-brand-green-darker border-brand-gold";
  if (tier === "premium") return "bg-brand-green-dark text-white border-brand-green-dark";
  return "bg-zinc-500 text-white border-zinc-500";
}

function StockIndicator({ qty }: { qty: number }) {
  if (qty <= 0) {
    return <span className="text-xs font-medium text-destructive">نفدت الكمية</span>;
  }
  if (qty <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        كمية محدودة
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      متوفر
    </span>
  );
}

export function ProductCard({ product, index = 0, onAddToOrder, onQuickView }: ProductCardProps) {
  const { orderItems, updateQuantity } = useOrder();
  const cartItem = orderItems.find((i) => i.product.slug === product.slug);
  const [qtyMode, setQtyMode] = useState(false);
  const displayImage = getProductDisplayImage(product);
  const stock = product.availableQuantity ?? 0;
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock || 1);
  const quantity = cartItem?.quantity ?? 1;
  const showStepper = Boolean(onAddToOrder) && (qtyMode || Boolean(cartItem));

  const handleAdd = () => {
    if (!onAddToOrder || outOfStock) return;
    onAddToOrder(product, 1);
    setQtyMode(true);
  };

  const handleQtyChange = (next: number) => {
    if (outOfStock) return;
    const clamped = Math.max(0, Math.min(maxQty, next));
    updateQuantity(product.slug, clamped);
    if (clamped <= 0) setQtyMode(false);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...catalogTransition,
        delay: Math.min(index, 12) * catalogStagger,
      }}
      className="h-full"
    >
      <article
        className={cn(
          "gift-tile group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card",
          outOfStock && "opacity-90"
        )}
      >
        {/* صورة المنتج */}
        <div className="relative">
          <div
            className={cn(
              "group/media relative aspect-square w-full overflow-hidden bg-white dark:bg-[#14201c]",
              outOfStock && "opacity-60 grayscale-[35%]"
            )}
          >
            <Image
              src={displayImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-[400ms] ease-out md:group-hover/media:scale-105"
              loading="lazy"
              unoptimized={isExternalOrArchiveImageSrc(displayImage)}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />

            {/* ضغط الصورة على الجوال يفتح العرض السريع */}
            {onQuickView ? (
              <button
                type="button"
                className="absolute inset-0 z-[1] md:hidden"
                onClick={handleQuickView}
                aria-label={`عرض سريع لـ ${product.name}`}
              />
            ) : (
              <button
                type="button"
                className="absolute inset-0 z-[1] md:hidden"
                onClick={() => {
                  saveCatalogViewSnapshot();
                  window.location.href = `/products/${product.slug}`;
                }}
                aria-label={product.name}
              />
            )}

            {/* تدرج أسفل الصورة — كمبيوتر عند hover / focus */}
            {onQuickView && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] hidden opacity-0 transition-opacity duration-200 md:block md:group-hover/media:opacity-100 md:group-focus-within/media:opacity-100"
                style={{
                  background:
                    "linear-gradient(to top, rgba(12,51,40,0.75), transparent 45%)",
                }}
              />
            )}

            {/* كبسولة «عرض سريع» — كمبيوتر فقط */}
            {onQuickView && (
              <button
                type="button"
                onClick={handleQuickView}
                aria-label={`عرض سريع لـ ${product.name}`}
                className={cn(
                  "absolute bottom-3 left-1/2 z-[2] hidden -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[#0c3328]",
                  "bg-white/92 shadow-md backdrop-blur-md",
                  "opacity-0 translate-y-2 transition-all duration-200 ease-out",
                  "hover:bg-[#C9A96E] hover:text-white",
                  "focus-visible:opacity-100 focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2",
                  "md:inline-flex md:group-hover/media:opacity-100 md:group-hover/media:translate-y-0",
                  "md:group-focus-within/media:opacity-100 md:group-focus-within/media:translate-y-0"
                )}
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                عرض سريع
              </button>
            )}

            {/* زر دائري للجوال — أسفل اليسار دائماً */}
            {onQuickView && (
              <button
                type="button"
                onClick={handleQuickView}
                aria-label={`عرض سريع لـ ${product.name}`}
                className="absolute bottom-2 left-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0c3328] shadow-md backdrop-blur-md md:hidden"
              >
                <Eye className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {product.giftTier && (
            <span
              className={cn(
                "absolute right-2 top-2 z-[3] rounded-md border px-2 py-0.5 text-[10px] font-bold sm:text-xs",
                tierBadgeClass(product.giftTier)
              )}
            >
              {getGiftTierLabel(product.giftTier)}
            </span>
          )}

          {outOfStock && (
            <span className="absolute left-2 top-2 z-[3] rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs">
              نفدت الكمية
            </span>
          )}
        </div>

        {/* جوال مبسّط */}
        <div className="flex flex-1 flex-col gap-2 p-2 sm:hidden">
          <Link
            href={`/products/${product.slug}`}
            scroll={false}
            onClick={() => saveCatalogViewSnapshot()}
            className="min-w-0"
          >
            <h3 className="line-clamp-2 text-sm font-bold leading-snug">{product.name}</h3>
          </Link>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StockIndicator qty={stock} />
            {onAddToOrder && (
              <Button
                type="button"
                size="icon"
                disabled={outOfStock}
                onClick={handleAdd}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-full bg-brand-gold text-brand-green-darker hover:bg-brand-gold-light",
                  outOfStock && "cursor-not-allowed opacity-50"
                )}
                aria-label="أضف للطلبية"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* سطح المكتب / تابلت */}
        <div className="hidden flex-1 flex-col p-3 sm:flex sm:p-4">
          <Link
            href={`/products/${product.slug}`}
            scroll={false}
            onClick={() => saveCatalogViewSnapshot()}
            className="min-w-0"
          >
            <h3 className="line-clamp-2 text-base font-bold leading-snug transition-colors hover:text-brand-green-dark dark:hover:text-brand-gold-light">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">كود: {product.sku}</p>
          <div className="mt-2">
            <StockIndicator qty={stock} />
          </div>

          <div className="mt-auto flex items-center gap-2 pt-3">
            {onAddToOrder && (
              <>
                {outOfStock ? (
                  <Button
                    disabled
                    className="h-11 min-h-[44px] w-full cursor-not-allowed bg-muted text-muted-foreground"
                  >
                    نفدت الكمية
                  </Button>
                ) : showStepper ? (
                  <div className="flex h-11 min-h-[44px] w-full items-center justify-between rounded-md border border-brand-gold/40 bg-brand-gold/10 px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleQtyChange(quantity - 1)}
                      aria-label="إنقاص"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      disabled={quantity >= maxQty}
                      onClick={() => handleQtyChange(quantity + 1)}
                      aria-label="زيادة"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleAdd}
                    className="h-11 min-h-[44px] w-full bg-brand-gold font-semibold text-brand-green-darker hover:bg-brand-gold-light"
                  >
                    أضف للطلبية
                  </Button>
                )}
              </>
            )}
            <InquireLink
              name={product.name}
              sku={product.sku}
              title="استفسر عن الهدية"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-green-dark/20 text-brand-green-dark transition hover:bg-brand-green-dark hover:text-white dark:border-brand-gold/30 dark:text-brand-gold-light dark:hover:bg-brand-gold dark:hover:text-brand-green-darker"
            >
              <MessageCircle className="h-5 w-5" />
            </InquireLink>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
