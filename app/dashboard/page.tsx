"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, Search } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/dashboard/product-form";
import { Product, type GiftTier, getGiftTierLabel, generateNextSKU, products as initialProducts } from "@/data/products";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  // تحميل المنتجات من localStorage بعد mount على العميل فقط
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
  }, []);

  // حفظ المنتجات في localStorage عند التحديث (فقط بعد mount)
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("products", JSON.stringify(products));
    }
  }, [products, mounted]);

  const filteredProducts = products.filter((product) =>
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
      const response = await fetch(`/api/products?slug=${slug}`, {
        method: "DELETE",
      });
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
      // التأكد من وجود SKU - توليده تلقائياً إذا لم يكن موجوداً
      if (!editingProduct && !productData.sku) {
        productData.sku = generateNextSKU();
      }

      // توليد slug تلقائياً إذا لم يكن موجوداً
      const generateSlug = (name: string): string => {
        // تحويل النص العربي إلى slug
        let slug = name
          .trim()
          .toLowerCase()
          // استبدال المسافات والأحرف الخاصة بشرطة
          .replace(/[\s\u200C\u200D\u200E\u200F\u202A-\u202E]+/g, "-")
          // إزالة الأحرف الخاصة غير المرغوبة
          .replace(/[^\w\u0600-\u06FF-]/g, "")
          // استبدال الشرطات المتعددة بشرطة واحدة
          .replace(/-+/g, "-")
          // إزالة الشرطات من البداية والنهاية
          .replace(/^-+|-+$/g, "");
        
        // إذا كان slug فارغاً، استخدم timestamp
        if (!slug) {
          slug = `product-${Date.now()}`;
        }
        
        return slug;
      };

      if (!productData.slug && productData.name) {
        let baseSlug = generateSlug(productData.name);
        let slug = baseSlug;
        let counter = 1;
        
        // التأكد من أن slug فريد - البحث في جميع المنتجات (من localStorage والبيانات الأولية)
        const allProductsToCheck = [...products, ...initialProducts];
        while (allProductsToCheck.some((p) => p.slug === slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        productData.slug = slug;
        
        // تسجيل للمساعدة في التشخيص
        console.log("Generated slug:", slug, "for product:", productData.name);
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
          // تحديث منتج موجود
          setProducts(
            products.map((p) =>
              p.slug === editingProduct.slug ? { ...p, ...productData } as Product : p
            )
          );
        } else {
          // إضافة منتج جديد
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
          
          // تسجيل للمساعدة في التشخيص
          console.log("Adding new product:", newProduct);
          console.log("Product slug:", newProduct.slug);
          
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">لوحة التحكم</h1>
              <p className="text-muted-foreground">
                إدارة المنتجات والهدايا المعروضة
              </p>
            </div>
            <Button
              onClick={handleAddProduct}
              className="w-full md:w-auto"
              size="lg"
            >
              <Plus className="ml-2 h-5 w-5" />
              إضافة منتج جديد
            </Button>
          </div>

          {/* Search */}
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

          {/* Products List */}
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
                          variant={
                            product.giftTier === "luxury" ? "default" : "outline"
                          }
                          className={
                            product.giftTier === "luxury"
                              ? "bg-brand-gold text-white"
                              : ""
                          }
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
                      <span className="font-semibold">
                        {product.availableQuantity || 0} قطعة
                      </span>
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
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="ml-2 h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteProduct(product.slug)}
                    >
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
                {searchQuery
                  ? "لم يتم العثور على منتجات تطابق البحث"
                  : "لا توجد منتجات"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Product Form Modal */}
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

