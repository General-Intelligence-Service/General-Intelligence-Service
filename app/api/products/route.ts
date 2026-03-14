import { NextRequest, NextResponse } from "next/server";
import { products as staticProducts, type Product, type GiftTier } from "@/data/products";
import {
  isProductsDbConfigured,
  ensureProductsTable,
  seedProductsIfEmpty,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products-db";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET - جلب جميع المنتجات (من قاعدة البيانات إن وُجدت، وإلا القائمة الثابتة)
export async function GET() {
  try {
    if (!isProductsDbConfigured()) {
      return NextResponse.json({ success: true, data: staticProducts });
    }
    await ensureProductsTable();
    await seedProductsIfEmpty();
    const data = await getAllProducts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في جلب المنتجات" },
      { status: 500 }
    );
  }
}

// POST - إضافة منتج جديد (في قاعدة البيانات)
export async function POST(request: NextRequest) {
  try {
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = await request.json();
    const newProduct: Product = {
      slug: body.slug || generateSlug(body.name),
      sku: body.sku,
      name: body.name,
      shortDescription: body.shortDescription ?? "",
      contents: Array.isArray(body.contents) ? body.contents : [],
      giftTier: (body.giftTier as GiftTier) || "standard",
      images: Array.isArray(body.images) ? body.images : [],
      availableQuantity: body.availableQuantity ?? 0,
      category: body.category,
      price: body.price,
    };
    await ensureProductsTable();
    await createProduct(newProduct);
    return NextResponse.json({
      success: true,
      message: "تم إضافة المنتج بنجاح",
      data: newProduct,
    });
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في إضافة المنتج" },
      { status: 500 }
    );
  }
}

// PUT - تحديث منتج (في قاعدة البيانات)
export async function PUT(request: NextRequest) {
  try {
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const body = await request.json();
    const slug = body.slug;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج (slug) مطلوب" },
        { status: 400 }
      );
    }
    const updatedData: Partial<Product> = {
      sku: body.sku,
      name: body.name,
      shortDescription: body.shortDescription,
      contents: body.contents,
      giftTier: body.giftTier,
      images: body.images,
      availableQuantity: body.availableQuantity,
      category: body.category,
      price: body.price,
    };
    await ensureProductsTable();
    const updated = await updateProduct(slug, updatedData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "تم تحديث المنتج بنجاح",
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في تحديث المنتج" },
      { status: 500 }
    );
  }
}

// DELETE - حذف منتج (من قاعدة البيانات)
export async function DELETE(request: NextRequest) {
  try {
    if (!isProductsDbConfigured()) {
      return NextResponse.json(
        { success: false, error: "قاعدة البيانات غير مُعدّة. أضف Postgres من لوحة Vercel." },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "معرف المنتج مطلوب" },
        { status: 400 }
      );
    }
    await ensureProductsTable();
    const deleted = await deleteProduct(slug);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "تم حذف المنتج بنجاح",
    });
  } catch (error) {
    console.error("DELETE /api/products:", error);
    return NextResponse.json(
      { success: false, error: "فشل في حذف المنتج" },
      { status: 500 }
    );
  }
}
