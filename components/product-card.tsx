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
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { saveCatalogViewSnapshot } from "@/lib/catalog-view-session";
import { cn } from "@/lib/utils";
import { useOrder } from "@/contexts/order-context";

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
        {/* صورة — الضغط يفتح العرض السريع إن وُجد، وإلا صفحة المنتج */}
        <div className="relative">
          <button
            type="button"
            className="relative block w-full text-right"
            onClick={(e) => {
              if (onQuickView) handleQuickView(e);
              else {
                saveCatalogViewSnapshot();
                window.location.href = `/products/${product.slug}`;
              }
            }}
            aria-label={`عرض سريع: ${product.name}`}
          >
            <div
              className={cn(
                "relative aspect-square w-full overflow-hidden bg-[#F7F3EA] dark:bg-[#1a2420]",
                outOfStock && "opacity-60 grayscale-[35%]"
              )}
            >
              <Image
                src={displayImage}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain transition-transform duration-300 md:group-hover:scale-105"
                loading="lazy"
                unoptimized={isExternalOrArchiveImageSrc(displayImage)}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
              {onQuickView && (
                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/0 transition md:flex md:group-hover:bg-black/15">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-green-dark opacity-0 shadow transition md:group-hover:opacity-100">
                    <Eye className="h-5 w-5" />
                  </span>
                </span>
              )}
            </div>
          </button>

          {product.giftTier && (
            <span
              className={cn(
                "absolute left-2 top-2 z-[1] rounded-md border px-2 py-0.5 text-[10px] font-bold sm:text-xs",
                tierBadgeClass(product.giftTier)
              )}
            >
              {getGiftTierLabel(product.giftTier)}
            </span>
          )}

          {outOfStock && (
            <span className="absolute right-2 top-2 z-[1] rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs">
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
            <a
              href={generateWhatsAppLink(product.name, product.sku)}
              target="_blank"
              rel="noopener noreferrer"
              title="استفسر عن الهدية"
              aria-label="استفسر عن الهدية عبر واتساب"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-green-dark/20 text-brand-green-dark transition hover:bg-brand-green-dark hover:text-white dark:border-brand-gold/30 dark:text-brand-gold-light dark:hover:bg-brand-gold dark:hover:text-brand-green-darker"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
