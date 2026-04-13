"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOrder } from "@/contexts/order-context";
import { products as initialProducts, type Product } from "@/data/products";
import { loadPublicProductsFromLocalStorage } from "@/lib/products-local-storage";

interface SharedOrderPayload {
  items: { slug: string; quantity: number }[];
  requesterName: string;
  orderNotes: string;
}

function OrderContent() {
  const searchParams = useSearchParams();
  const { restoreFromDraft, openCartRef } = useOrder();
  const [payload, setPayload] = useState<SharedOrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProductsList(loadPublicProductsFromLocalStorage());
  }, []);

  useEffect(() => {
    const d = searchParams.get("d");
    if (!d) {
      setError("لا يوجد رابط طلبية صالح.");
      return;
    }
    try {
      const decoded = decodeURIComponent(atob(d));
      const parsed = JSON.parse(decoded) as SharedOrderPayload;
      if (!parsed || !Array.isArray(parsed.items)) {
        setError("صيغة الرابط غير صحيحة.");
        return;
      }
      setPayload(parsed);
    } catch {
      setError("تعذر قراءة رابط الطلبية.");
    }
  }, [searchParams]);

  const handleImport = () => {
    if (!payload || payload.items.length === 0) return;
    const items = payload.items
      .map(({ slug, quantity }) => {
        const product = productsList.find((p) => p.slug === slug);
        return product ? { product, quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);
    if (items.length === 0) {
      setError("لم يتم العثور على الهدايا في الكتالوج الحالي.");
      return;
    }
    restoreFromDraft(items, payload.requesterName || "", payload.orderNotes || "");
    setImported(true);
    openCartRef.current?.();
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/">
            <Button>العودة للكتالوج</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">جاري تحميل الطلبية...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const totalPieces = payload.items.reduce((s, i) => s + i.quantity, 0);
  const resolvedItems = payload.items.map(({ slug, quantity }) => ({
    product: productsList.find((p) => p.slug === slug),
    quantity,
  })).filter((x) => x.product);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">طلبية مشاركة</h1>
        <p className="text-muted-foreground mb-6">
          تم مشاركة هذه الطلبية معك. يمكنك استيرادها إلى سلتك أو تصفح الكتالوج.
        </p>

        {payload.requesterName ? (
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">الجهة الطالبة:</span> {payload.requesterName}
          </p>
        ) : null}
        {payload.orderNotes ? (
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-medium">ملاحظات:</span> {payload.orderNotes}
          </p>
        ) : null}

        <Card className="mb-6">
          <CardContent className="p-4">
            <ul className="space-y-2">
              {resolvedItems.map(({ product, quantity }) => (
                <li key={product!.slug} className="flex justify-between gap-2 border-b border-dashed pb-2 last:border-0">
                  <span className="font-medium truncate">{product!.name}</span>
                  <span className="text-primary font-semibold shrink-0">{quantity} قطعة</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">الإجمالي: {totalPieces} قطعة</p>
          </CardContent>
        </Card>

        {imported ? (
          <p className="text-green-600 font-medium mb-4">تم استيراد الطلبية إلى سلتك.</p>
        ) : (
          <Button size="lg" className="w-full min-h-[44px]" onClick={handleImport}>
            <ShoppingCart className="ml-2 h-5 w-5" />
            استيراد إلى سلتي
          </Button>
        )}

        <Link href="/" className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline">
          <ArrowRight className="h-4 w-4" />
          العودة للكتالوج
        </Link>
      </main>
      <Footer />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">جاري التحميل...</p></main>
        <Footer />
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
