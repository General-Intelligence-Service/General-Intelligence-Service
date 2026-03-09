"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus, Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product, getGiftTierLabel } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToOrder?: (product: Product, quantity?: number) => void;
}

export function ProductCard({ product, index = 0, onAddToOrder }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);

  const handleAdd = () => {
    if (onAddToOrder && quantity >= 1) {
      onAddToOrder(product, quantity);
      setQuantity(1);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 2200);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
        <Link href={`/products/${product.slug}`}>
          <CardHeader className="p-0">
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {product.images && product.images.length > 0 && product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><span>لا توجد صورة</span></div>';
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <span>لا توجد صورة</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Link>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Link href={`/products/${product.slug}`}>
              <h3 className="text-xl font-semibold leading-tight hover:text-brand-green-dark">
                {product.name}
              </h3>
            </Link>
            {product.giftTier && (
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
            )}
          </div>
          <p className="mb-3 line-clamp-2 text-base text-muted-foreground">
            {product.shortDescription}
          </p>
          <p className="text-base text-muted-foreground">كود: {product.sku}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 p-3 sm:p-4 pt-0">
          {onAddToOrder && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">الكمية:</span>
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 touch-manipulation"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 touch-manipulation"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {showAdded ? (
                <div className="flex items-center justify-center gap-2 rounded-md border border-green-600 bg-green-50 py-2.5 text-sm font-medium text-green-700">
                  <Check className="h-4 w-4" />
                  تمت الإضافة
                </div>
              ) : (
                <Button
                  onClick={handleAdd}
                  variant="outline"
                  className="w-full border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
                >
                  <ShoppingCart className="ml-2 h-4 w-4" />
                  أضف للطلبية
                </Button>
              )}
            </div>
          )}
          <a
            href={generateWhatsAppLink(product.name, product.sku)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker h-12 sm:h-11 rounded-md px-5 py-3 sm:py-2 touch-manipulation"
          >
            استفسر عن المنتج
          </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

