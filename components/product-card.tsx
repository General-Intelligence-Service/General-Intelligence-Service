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
  const displayName = (product.name ?? "").trim();
  const displayDesc = (product.shortDescription ?? "").trim();
  const displaySku = (product.sku ?? "").trim();
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
        <div className="relative">
          <div
            className={cn(
              "group/media relative aspect-square w-full overflow-hidden bg-white dark:bg-[#14201c]",
              outOfStock && "opacity-60 grayscale-[35%]"
            )}
          >
            <Image
              src={displayImage}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-[400ms] ease-out md:group-hover/media:scale-105"
              loading="lazy"
              unoptimized={isExternalOrArchiveImageSrc(displayImage)}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />

            {/* لمسة الصورة على الجوال — مخفية عن قارئات الشاشة؛ الزر أدناه هو التحكم الوحيد */}
            {onQuickView ? (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="absolute inset-0 z-[1] md:hidden"
                onClick={handleQuickView}
              />
            ) : (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="absolute inset-0 z-[1] md:hidden"
                onClick={() => {
                  saveCatalogViewSnapshot();
                  window.location.href = `/products/${product.slug}`;
                }}
              />
            )}

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

            {/* زر عرض سريع واحد: شكل الجوال / كبسولة سطح المكتب */}
            {onQuickView && (
              <button
                type="button"
                onClick={handleQuickView}
                aria-label={`عرض سريع لـ ${displayName}`}
                className={cn(
                  "absolute z-[2] items-center justify-center",
                  // جوال: زر دائري أسفل اليسار
                  "bottom-2 left-2 inline-flex h-8 w-8 rounded-full bg-white/90 text-[#0c3328] shadow-md backdrop-blur-md",
                  // سطح المكتب: كبسولة وسط أسفل مع hover
                  "md:bottom-3 md:left-1/2 md:h-auto md:w-auto md:-translate-x-1/2 md:gap-1.5 md:rounded-full md:px-3.5 md:py-2 md:text-sm md:font-semibold",
                  "md:bg-white/92 md:opacity-0 md:translate-y-2 md:transition-all md:duration-200 md:ease-out",
                  "md:hover:bg-[#C9A96E] md:hover:text-white",
                  "md:focus-visible:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:outline-none md:focus-visible:ring-2 md:focus-visible:ring-[#C9A96E] md:focus-visible:ring-offset-2",
                  "md:group-hover/media:opacity-100 md:group-hover/media:translate-y-0",
                  "md:group-focus-within/media:opacity-100 md:group-focus-within/media:translate-y-0"
                )}
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden md:inline">عرض سريع</span>
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

        {/* محتوى واحد متجاوب — بدون نسخ مكررة لقارئات الشاشة */}
        <div className="flex flex-1 flex-col gap-2 p-2 sm:gap-0 sm:p-3 md:p-4">
          <Link
            href={`/products/${product.slug}`}
            scroll={false}
            onClick={() => saveCatalogViewSnapshot()}
            className="min-w-0"
          >
            <h3 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base sm:transition-colors sm:hover:text-brand-green-dark dark:sm:hover:text-brand-gold-light">
              {displayName}
            </h3>
          </Link>

          <p className="mt-1.5 hidden line-clamp-2 text-sm text-muted-foreground sm:block">
            {displayDesc}
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground/80 sm:block">كود: {displaySku}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 sm:mt-2 sm:block sm:pt-0">
            <div className="sm:mt-2">
              <StockIndicator qty={stock} />
            </div>

            <div className="flex items-center gap-2 sm:mt-3 sm:w-full">
              {onAddToOrder && (
                <>
                  {outOfStock ? (
                    <Button
                      disabled
                      aria-label="نفدت الكمية"
                      className="h-10 w-10 shrink-0 cursor-not-allowed rounded-full bg-muted text-muted-foreground sm:h-11 sm:min-h-[44px] sm:w-full sm:rounded-md"
                    >
                      <Plus className="h-5 w-5 sm:hidden" aria-hidden />
                      <span className="hidden sm:inline">نفدت الكمية</span>
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
                      aria-label="أضف للطلبية"
                      className="h-10 w-10 shrink-0 rounded-full bg-brand-gold font-semibold text-brand-green-darker hover:bg-brand-gold-light sm:h-11 sm:min-h-[44px] sm:w-full sm:rounded-md"
                    >
                      <Plus className="h-5 w-5 sm:hidden" aria-hidden />
                      <span className="hidden sm:inline">أضف للطلبية</span>
                    </Button>
                  )}
                </>
              )}
              <InquireLink
                name={displayName}
                sku={displaySku}
                title="استفسر عن الهدية"
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-green-dark/20 text-brand-green-dark transition hover:bg-brand-green-dark hover:text-white sm:inline-flex dark:border-brand-gold/30 dark:text-brand-gold-light dark:hover:bg-brand-gold dark:hover:text-brand-green-darker"
              >
                <MessageCircle className="h-5 w-5" />
              </InquireLink>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
