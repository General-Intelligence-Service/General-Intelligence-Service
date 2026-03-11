"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product, getGiftTierLabel } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface QuickViewModalProps {
  product: Product;
  onClose: () => void;
  onAddToOrder: (product: Product, quantity?: number) => void;
}

export function QuickViewModal({ product, onClose, onAddToOrder }: QuickViewModalProps) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToOrder(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

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
          <div className="relative aspect-square w-full bg-muted">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 512px) 100vw, 512px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">لا توجد صورة</div>
            )}
          </div>
          <div className="p-4 space-y-3">
            {product.giftTier && (
              <Badge variant={product.giftTier === "luxury" ? "default" : "outline"}>
                {getGiftTierLabel(product.giftTier)}
              </Badge>
            )}
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">كود: {product.sku}</p>
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
              <Link href={`/products/${product.slug}`} onClick={onClose}>
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
