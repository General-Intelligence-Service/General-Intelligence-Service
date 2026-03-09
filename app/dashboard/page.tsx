"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Package, Search, LogOut, Download, Upload, BarChart3 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/dashboard/product-form";
import { Product, type GiftTier, getGiftTierLabel, generateNextSKU, products as initialProducts } from "@/data/products";

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) setAuthOk(true);
        else setAuthOk(false);
      })
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  useEffect(() => {
    setMounted(true);
    const loadProducts = (): Product[] => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("products");
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch {
            return initialProducts;
          }
        }
      }
      return initialProducts;
    };
    setProducts(loadProducts());
    if (typeof window !== "undefined") {
      const n = parseInt(localStorage.getItem("visit_count") ?? "0", 10);
      setVisitCount(n);
    }
  }, []);


  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("products", JSON.stringify(products));
    }
  }, [products, mounted]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (slug: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const response = await fetch(`/api/products?slug=${slug}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        setProducts(products.filter((p) => p.slug !== slug));
      } else {
        alert("فشل في حذف المنتج");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("حدث خطأ أثناء حذف المنتج");
    }
  };

  const handleFormSubmit = async (productData: Partial<Product>) => {
    try {
      if (!editingProduct && !productData.sku) {
        productData.sku = generateNextSKU();
      }

      const generateSlug = (name: string): string => {
        let slug = name
          .trim()
          .toLowerCase()
          .replace(/[\s\u200C\u200D\u200E\u200F\u202A-\u202E]+/g, "-")
          .replace(/[^\w\u0600-\u06FF-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slug) slug = `product-${Date.now()}`;
        return slug;
      };

      if (!productData.slug && productData.name) {
        let baseSlug = generateSlug(productData.name);
        let slug = baseSlug;
        let counter = 1;
        const allProductsToCheck = [...products, ...initialProducts];
        while (allProductsToCheck.some((p) => p.slug === slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        productData.slug = slug;
      }

      const method = editingProduct ? "PUT" : "POST";
      const response = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct ? { ...editingProduct, ...productData } : productData),
      });
      const result = await response.json();

      if (result.success) {
        if (editingProduct) {
          setProducts(
            products.map((p) =>
              p.slug === editingProduct.slug ? ({ ...p, ...productData } as Product) : p
            )
          );
        } else {
          const newProduct: Product = {
            slug: productData.slug!,
            sku: productData.sku!,
            name: productData.name!,
            shortDescription: productData.shortDescription!,
            contents: productData.contents || [],
            giftTier: productData.giftTier!,
            images: productData.images || [],
            availableQuantity: productData.availableQuantity || 0,
            category: productData.category,
            price: productData.price,
          };
          setProducts([...products, newProduct]);
        }
        setIsFormOpen(false);
        setEditingProduct(null);
      } else {
        alert("فشل في حفظ المنتج");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("حدث خطأ أثناء حفظ المنتج");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  };

  const escapeCsv = (s: string | number) => {
    const t = String(s ?? "").replace(/"/g, '""');
    return t.includes(",") || t.includes("\n") || t.includes('"') ? `"${t}"` : t;
  };

  const handleExportCSV = () => {
    const headers = ["الاسم", "الكود", "التصنيف", "الفئة", "الكمية المتوفرة", "السعر", "الوصف"];
    const rows = products.map((p) => [
      p.name,
      p.sku,
      getGiftTierLabel(p.giftTier),
      p.category ?? "",
      p.availableQuantity ?? 0,
      p.price ?? "",
      (p.shortDescription ?? "").replace(/\s+/g, " "),
    ]);
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `منتجات-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = () => {
    const json = JSON.stringify(products, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `منتجات-نسخة-احتياطية-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data) || data.length === 0) {
          alert("الملف يجب أن يحتوي على مصفوفة منتجات.");
          return;
        }
        const valid = data.every((p: unknown) => p && typeof p === "object" && "slug" in p && "name" in p && "sku" in p);
        if (!valid) {
          alert("صيغة الملف غير صحيحة. تأكد أنه نسخة احتياطية من المنتجات.");
          return;
        }
        if (!confirm(`سيتم استبدال ${products.length} منتج بـ ${data.length} منتج. متابعة؟`)) return;
        setProducts(data as Product[]);
        if (typeof window !== "undefined") localStorage.setItem("products", JSON.stringify(data));
        alert("تمت الاستعادة بنجاح.");
      } catch {
        alert("تعذر قراءة الملف. تأكد أنه ملف JSON صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (authOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  if (authOk === false) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">لوحة التحكم</h1>
              <p className="text-muted-foreground">إدارة المنتجات والهدايا المعروضة</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddProduct} size="lg">
                <Plus className="ml-2 h-5 w-5" />
                إضافة منتج جديد
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout} title="تسجيل الخروج">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">تسجيل الخروج</span>
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                إحصائيات وأدوات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">عدد المنتجات:</span>
                  <span className="mr-2 font-bold text-lg">{products.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">عدد زيارات الصفحة الرئيسية:</span>
                  <span className="mr-2 font-bold text-lg">{visitCount}</span>
                  <span className="text-muted-foreground text-xs">(هذا المتصفح)</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="ml-2 h-4 w-4" />
                  تصدير CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleBackup}>
                  <Download className="ml-2 h-4 w-4" />
                  تحميل نسخة احتياطية
                </Button>
                <label className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer">
                  <Upload className="ml-2 h-4 w-4" />
                  استعادة من ملف
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleRestore} />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ابحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.slug} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2 text-xl">{product.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">كود: {product.sku}</Badge>
                        <Badge
                          variant={product.giftTier === "luxury" ? "default" : "outline"}
                          className={product.giftTier === "luxury" ? "bg-brand-gold text-white" : ""}
                        >
                          {getGiftTierLabel(product.giftTier)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {product.shortDescription}
                  </p>
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">الكمية المتوفرة:</span>
                      <span className="font-semibold">{product.availableQuantity || 0} قطعة</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">المحتويات:</span>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        {product.contents.slice(0, 3).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                        {product.contents.length > 3 && (
                          <li className="text-xs">+{product.contents.length - 3} أكثر</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => handleEditProduct(product)}>
                      <Edit className="ml-2 h-4 w-4" />
                      تعديل
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleDeleteProduct(product.slug)}>
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {searchQuery ? "لم يتم العثور على منتجات تطابق البحث" : "لا توجد منتجات"}
              </p>
            </div>
          )}
        </div>
      </main>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      <Footer />
    </div>
  );
}
