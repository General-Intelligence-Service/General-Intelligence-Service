"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product, getGiftTierLabel } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToOrder?: (product: Product) => void;
}

export function ProductCard({ product, index = 0, onAddToOrder }: ProductCardProps) {

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
        <CardContent className="p-4">
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
        <CardFooter className="flex flex-col gap-2 p-4 pt-0">
          {onAddToOrder && (
            <Button
              onClick={() => onAddToOrder(product)}
              variant="outline"
              className="w-full border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
            >
              <ShoppingCart className="ml-2 h-4 w-4" />
              أضف للطلبية
            </Button>
          )}
          <a
            href={generateWhatsAppLink(product.name, product.sku)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker h-11 rounded-md px-5"
          >
            استفسر عن المنتج
          </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

