"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, type GiftTier, getGiftTierLabel, getAllGiftTiers, generateNextSKU } from "@/data/products";

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => void | Promise<void>;
}

export function ProductForm({ product, onClose, onSubmit }: ProductFormProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    sku: "",
    shortDescription: "",
    contents: [],
    giftTier: "standard",
    images: [],
    availableQuantity: 0,
  });
  const [contentInput, setContentInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const giftTiers = getAllGiftTiers();

  useEffect(() => {
    if (product) {
      // تعديل منتج موجود - يُحفظ slug للمرجعية (الحفظ الفعلي يستخدم slug من الداشبورد)
      setFormData({
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        shortDescription: product.shortDescription,
        contents: product.contents,
        giftTier: product.giftTier,
        images: product.images,
        availableQuantity: product.availableQuantity || 0,
        category: product.category,
        price: product.price,
        archived: product.archived,
      });
    } else {
      // منتج جديد - توليد SKU تلقائياً
      setFormData({
        name: "",
        sku: generateNextSKU(),
        shortDescription: "",
        contents: [],
        giftTier: "standard",
        images: [],
        availableQuantity: 0,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  const addContent = () => {
    if (contentInput.trim()) {
      setFormData({
        ...formData,
        contents: [...(formData.contents || []), contentInput.trim()],
      });
      setContentInput("");
    }
  };

  const removeContent = (index: number) => {
    const newContents = [...(formData.contents || [])];
    newContents.splice(index, 1);
    setFormData({ ...formData, contents: newContents });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: uploadFormData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          ...formData,
          images: [...(formData.images || []), result.url],
        });
      } else {
        alert(result.error || "فشل في رفع الصورة");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
      // إعادة تعيين input
      e.target.value = "";
    }
  };

  const addImageUrl = () => {
    const imageInput = prompt("أدخل رابط الصورة:");
    if (imageInput?.trim()) {
      setFormData({
        ...formData,
        images: [...(formData.images || []), imageInput.trim()],
      });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "تعديل هدية" : "إضافة هدية جديدة"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* اسم الهدية */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              اسم الهدية *
            </label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="مثال: سيف دمشقي مُصدَّف"
            />
          </div>

          {/* كود الهدية */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              كود الهدية (SKU)
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={formData.sku || ""}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
                placeholder="سيتم توليده تلقائياً"
              />
              <Badge variant="outline" className="shrink-0">
                تلقائي
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              يتم توليد الكود تلقائياً عند إضافة هدية جديدة
            </p>
          </div>

          {/* الوصف */}
          <div>
            <label className="mb-2 block text-sm font-medium">الوصف المختصر *</label>
            <textarea
              value={formData.shortDescription || ""}
              onChange={(e) =>
                setFormData({ ...formData, shortDescription: e.target.value })
              }
              required
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="وصف مختصر للهدية..."
            />
          </div>

          {/* الكمية المتوفرة (العدد) */}
          <div>
            <label className="mb-2 block text-sm font-medium">الكمية المتوفرة (العدد)</label>
            <Input
              type="number"
              min={0}
              value={formData.availableQuantity ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  availableQuantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              placeholder="0"
            />
          </div>

          {/* تصنيف الهدية */}
          <div>
            <label className="mb-2 block text-sm font-medium">تصنيف الهدية *</label>
            <div className="flex flex-wrap gap-2">
              {giftTiers.map((tier) => (
                <Badge
                  key={tier}
                  variant={
                    formData.giftTier === tier ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => setFormData({ ...formData, giftTier: tier })}
                >
                  {getGiftTierLabel(tier)}
                </Badge>
              ))}
            </div>
          </div>

          {/* المحتويات */}
          <div>
            <label className="mb-2 block text-sm font-medium">محتويات الهدية</label>
            <div className="mb-2 flex gap-2">
              <Input
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="أضف محتوى..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addContent();
                  }
                }}
              />
              <Button type="button" onClick={addContent} variant="outline">
                إضافة
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.contents?.map((content, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeContent(index)}
                >
                  {content} <X className="mr-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>

          {/* الصور */}
          <div>
            <label className="mb-2 block text-sm font-medium">صور الهدية</label>
            <div className="mb-2 flex flex-wrap gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker h-11 px-5 py-2.5 cursor-pointer ${
                    uploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {uploading ? "جاري الرفع..." : "رفع صورة من الحاسب"}
                </div>
              </label>
              <Button
                type="button"
                onClick={addImageUrl}
                variant="outline"
                disabled={uploading}
              >
                إضافة رابط صورة
              </Button>
            </div>
            {formData.images && formData.images.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">الصور المضافة:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <Badge
                        variant="secondary"
                        className="cursor-pointer pr-6"
                        onClick={() => removeImage(index)}
                      >
                        <span className="truncate max-w-[200px]">{image}</span>
                        <X className="mr-1 h-3 w-3 absolute right-1" />
                      </Badge>
                      {image.startsWith("/images/") && (
                        <div className="mt-1 relative w-20 h-20 border rounded overflow-hidden">
                          <Image
                            src={image}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : product ? "حفظ التعديلات" : "إضافة الهدية"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

